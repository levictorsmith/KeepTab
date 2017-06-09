const EXTENSION_URL = chrome.runtime.getURL("/");
var tempTabs = [];
/**
 * onMerge: Handle the 'merge' event
 * @param {Object} info - Information about the item clicked and the context where the click happened.
 * @param {Object} tab - The details of the tab where the click took place. If the click did not take place in a tab, this parameter will be missing.
 */
function onMerge(info, tab) {
  if (info != null) {
    console.log("Merge clicked", info.menuItemId);  
  }
  console.log("Current tab:",tab); 
  chrome.tabs.query({currentWindow: true}, function (tabs) {
    for (var i = 0; i < tabs.length; ++i) {
      if (tabs[i].id == tab.id && tabs.length > 1) {
        //Push on current tab
        var ids = [];
        tempTabs.push(tabs[i]);
        ids.push(tabs[i].id);
        if (i > 0) {
          //Default merge to left
          tempTabs.push(tabs[i - 1]);          
          ids.push(tabs[i - 1].id);
        } else {
          //If tab is the first and not the only one, merge right
          tempTabs.push(tabs[i + 1]);
          ids.push(tabs[i + 1].id);
        }
      }
    }
    // tempTabs = tabs;
    var url = EXTENSION_URL + "keep.html";
    chrome.tabs.create({"url": url, "index": tab.index, "active": true});
    chrome.tabs.remove(ids);
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

//Handle key-stroke commands
chrome.commands.onCommand.addListener(function (command) {
  switch (command) {
    case "merge-tab":
      chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        var current = tabs[0];
        onMerge(null,current);
      });
      break;
  
    default:
      break;
  }
});