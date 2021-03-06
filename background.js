var db = require('./db.js');
//TODO: Change all imageTabs to just regular tab objects
//TODO: Add session functionality

const EXTENSION_URL = chrome.runtime.getURL("/");

/*
 * Setup key-shortcuts and context menu items
 */
(function (db) {
	// Create context menu items
	var menuParentId = chrome.contextMenus.create({
		"id": "parent",
		"title": "KeepTab",
		"contexts": ["page", "frame"]
	});
	chrome.contextMenus.create({"id": "merge", "title": "Merge into adjacent tab", "parentId": menuParentId});
	chrome.contextMenus.onClicked.addListener(onMerge);

	// Handle key-stroke events
	chrome.commands.onCommand.addListener(function (command) {
		switch (command) {
			case "merge-default":
			case "merge-left":
			case "merge-right":
				chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
					var current = tabs[0];
					onMerge(null, current, command);
				});
				break;
		
			default:
				break;
		}
	});

	// Handle messages from content script
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message.hasOwnProperty('function')) {
			switch (message.function) {
				case "getSessionUrls":
					db.getSessionUrls(message.params.sessionId, (urls) => {
						sendResponse({urls: urls});
					});
					break;
				case "getImageTab":
					var imageTab = {};
					db.getImage(message.params.url, (dataUrl) => {
						imageTab.imageUrl = dataUrl;
						db.getTab(message.params.url, (tab) => {
							imageTab.tab = tab;
							sendResponse({imageTab: imageTab});
						});
					});
					break;
				case "removeCard":
					db.removeImage(message.params.url);
					db.removeTab(message.params.url);
					db.removeUrlFromSession(message.params.sessionId, message.params.url);
					if (message.params.last) {
						db.removeSession(message.params.sessionId);
						sendResponse({last: true});
					} else {
						sendResponse({last: false});
					}
					break;
				default:
				console.error("Error: Unknown function");
					break;
			}
			return true;
		} else {
			console.error("NO FUNCTION PARAMETER!");
		}
	});
})(db);

/**
 * onMerge: Handle the 'merge' event
 * @param {Object} info - Information about the item clicked and the context where the click happened.
 * @param {Object} tab - The details of the tab where the click took place. If the click did not take place in a tab, this parameter will be missing.
 */
function onMerge(info, tab, command) {
  chrome.tabs.query({currentWindow: true}, function (tabs) {
    if (tabs.length <= 1) {
      return;
    }
    var nextIndex = getNextIndex(command, tab, tabs);
    
    var imageTab1 = {};
    var imageTab2 = {};
    imageTab1.tab = tab;
    imageTab2.tab = tabs[nextIndex];

    getFirstTabImage(imageTab1, imageTab2, tabs);

  });
}

/**
 * getNextIndex: Returns the valid adjacent tab index, defaults to merge-left
 * @param {String} command - Type of key-stroke/command
 * @param {Object} tab - Currently focused tab
 * @param {Array} tabs - Array of all tabs in the currently focused window
 */
function getNextIndex(command, tab, tabs) {
  if (command == "merge-left" && tab.index > 0) {
    return tab.index - 1;
  } else if(command == "merge-right" && tab.index < tabs.length - 1) {
    return tab.index + 1;
  } 
  return (tab.index > 0) ? (tab.index - 1) : (tab.index + 1);
}

/**
 * getFirstTabImage: Gets the current tab's thumbnail
 * @param {Object} imageTab1 - The current tab with attached image
 * @param {Object} imageTab2 - The adjacent tab with attached image
 * @param {Array} tabs - Array of all tabs in the currently focused window
 */
function getFirstTabImage(imageTab1, imageTab2, tabs) {
  chrome.tabs.captureVisibleTab(function (dataUrl) {
    //Save image and tab to DB
	 db.insertImageTab(imageTab1, dataUrl);
    getSecondTabImage(imageTab1, imageTab2, tabs);
  });
}

/**
 * getSecondTabImage: Gets the adjacent tab's thumbnail
 * @param {Object} imageTab1 - The current tab with attached image
 * @param {Object} imageTab2 - The adjacent tab with attached image
 * @param {Array} tabs - Array of all tabs in the currently focused window
 */
function getSecondTabImage(imageTab1, imageTab2, tabs) {
  chrome.tabs.update(imageTab2.tab.id, {active: true}, function (focusedTab) {
    chrome.tabs.captureVisibleTab(function (dataUrl) {

      db.insertImageTab(imageTab2, dataUrl);
      finishMerge(imageTab1, imageTab2);
    });
  });
}

/**
 * finishMerge: Removes the tabs and creates a new tab with the image tabs
 * @param {Object} imageTab1 - The current tab with attached image
 * @param {Object} imageTab2 - The adjacent tab with attached image
 */
function finishMerge(imageTab1, imageTab2) {
  //Remove old tabs and merge into a new tab
  chrome.tabs.remove(imageTab1.tab.id, function () {
    chrome.tabs.remove(imageTab2.tab.id, function () {
      //Call mergeKeptTabs to get the sessionUrls
      mergeKeptTabs(imageTab1, imageTab2, function (sessionUrls) {
        //If there are no previously kept tabs
        if (sessionUrls == null) {
          sessionUrls = [];
          sessionUrls.push(imageTab1.tab.url);
          sessionUrls.push(imageTab2.tab.url);
          db.insertSession(sessionUrls);
        }
        db.getSessionId(sessionUrls, function (id) {
          var url = EXTENSION_URL + "keep.html?session=" + id;
          chrome.tabs.create({"url": url, "index": imageTab1.tab.index, active: true});        
        });
      });
    });
  });
}

/**
 * mergeKeptTabs
 * @param {Object} imageTab1 - A tab with an attached image
 * @param {*} imageTab2 
 * @param {*} callback 
 */
function mergeKeptTabs(imageTab1, imageTab2, callback) {
	//TODO: Remove KeepTab tabs when merged
  var tab1HasKept = imageTab1.tab.url.includes(EXTENSION_URL + "keep.html");
  var tab2HasKept = imageTab2.tab.url.includes(EXTENSION_URL + "keep.html");
  var sessionId;
  var sessionUrls = null;
  //If both have kept tabs
  if (tab1HasKept && tab2HasKept) {
    //Get the SessionIds from the tabs
    var urlParams1 = (new URL(imageTab1.tab.url)).searchParams;
    var sessionId1 = urlParams1.get('session');
    var urlParams2 = (new URL(imageTab2.tab.url)).searchParams;
    var sessionId2 = urlParams2.get('session');
    var urls1;
    var urls2; 
    db.getSessionUrls(sessionId1, function (urls) {
      urls1 = urls;
      db.getSessionUrls(sessionId2, function (urls) {
        urls2 = urls;
        Array.prototype.push.apply(urls1, urls2);
        db.insertSession(urls1);
        db.removeSession(sessionId1);
        db.removeSession(sessionId2);
        sessionUrls = urls1;
        callback(sessionUrls);
      });
    });
  } else if (tab1HasKept) {
    let urlParams = (new URL(imageTab1.tab.url)).searchParams;
    sessionId = urlParams.get('session');
    db.addUrlToSession(sessionId,imageTab2.tab.url, function (urls) {
      sessionUrls = urls;
      callback(sessionUrls);
    });
  } else if (tab2HasKept) {
    let urlParams = (new URL(imageTab2.tab.url)).searchParams;
    sessionId = urlParams.get('session');
    db.addUrlToSession(sessionId, imageTab1.tab.url, function (urls) {
      sessionUrls = urls;
      callback(sessionUrls);
    });
  } else {
    //There were no previously kept tabs
    callback(null);
  }
}