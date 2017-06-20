//TODO: Change all imageTabs to just regular tab objects
const EXTENSION_URL = chrome.runtime.getURL("/");
//Set up Database
const DATABASE_NAME = "keepTab";
const TAB_STORE = "TabStore";
const IMAGE_STORE = "ImageStore";
const IMAGE_INDEX = "ImageIndex";
const TAB_INDEX = "TabIndex";
// IndexedDB
var indexedDB = window.indexedDB;

var open = indexedDB.open(DATABASE_NAME, 1);

var db;
var imageStore;
var imageIndex;
var tabStore;
var tabIndex;
var tx;

//Create schema
open.onupgradeneeded = function () {
	db = open.result;
	imageStore = db.createObjectStore(IMAGE_STORE, {keyPath: "id"});
  tabStore = db.createObjectStore(TAB_STORE, {keyPath: "id"});
	imageIndex = imageStore.createIndex(IMAGE_INDEX, ["image.tabId"]);
  tabIndex = tabStore.createIndex(TAB_INDEX, ["tab.url"]);
};

open.onsuccess = function () {
	db = open.result;
	tx = db.transaction(IMAGE_STORE, "readwrite");
	imageStore = tx.objectStore(IMAGE_STORE);
	imageIndex = imageStore.index(IMAGE_INDEX);
  tabStore = tx.objectStore(TAB_STORE);
  tabIndex = tabStore.index(TAB_INDEX);
};

tx.oncomplete = function () {
	db.close();
}

var tempTabs = [];
/**
 * onMerge: Handle the 'merge' event
 * @param {Object} info - Information about the item clicked and the context where the click happened.
 * @param {Object} tab - The details of the tab where the click took place. If the click did not take place in a tab, this parameter will be missing.
 */
function onMerge(info, tab, command) {
  if (info != null) {
    console.log("Context menu item clicked", info.menuItemId);
  }
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
 * Create context menu items
 */
var menuParentId = chrome.contextMenus.create({
  "id": "parent",
  "title": "KeepTab"
});
chrome.contextMenus.create({"id": "merge", "title": "Merge into adjacent tab", "parentId": menuParentId});
chrome.contextMenus.onClicked.addListener(onMerge);

/**
 * Handle key-stroke events
 */
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

/**
 * getNextIndex: Returns the valid adjacent tab index
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
    //TODO: Save image to db
    imageStore.put({id: imageTab1.tab.id, url: dataUrl});
    tabStore.put({id: imageTab1.tab.id, url: imageTab1.tab.url, tab: imageTab1.tab});
    imageTab1.imageUrl = dataUrl;
    //If the merge attempted tab is already keeping tabs, include all those tabs too
    if (imageTab1.tab.url.includes(EXTENSION_URL + "keep.html")) {
      pushKeptTabs(imageTab1);
    } else {
      tempTabs.push(imageTab1);
    }
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
      //TODO: Save image to db
      imageStore.put({id: imageTab2.tab.id, url: dataUrl});
      tabStore.put({id: imageTab2.tab.id, url: imageTab2.tab.url, tab: imageTab2.tab});
      imageTab2.imageUrl = dataUrl;
      //If the merge attempted tab is already keeping tabs, include all those tabs too
      if (imageTab2.tab.url.includes(EXTENSION_URL + "keep.html")) {
        pushKeptTabs(imageTab2);
      } else {
        tempTabs.push(imageTab2);
      }
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
      var url = EXTENSION_URL + "keep.html";
      chrome.tabs.create({"url": url, "index": imageTab1.tab.index, active: true});
    });
  });
}

/**
 * pushKeptTabs: Pushes onto tempTabs all the tabs in the given tab
 * @param {Object} imageTab - A tab with an attached image
 */
function pushKeptTabs(imageTab) {
  //Send a message to the content script of the given tab to get array of imageTabs to add to TempTabs array.
  chrome.tabs.sendMessage(imageTab.tab.id, {command: "getAllKeptTabs"}, function (response) {
    Array.prototype.push.apply(tempTabs, response.imageTabs);
  });
}