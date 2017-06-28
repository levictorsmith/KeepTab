const EXTENSION_URL = chrome.runtime.getURL("/");
//Set up Database
const DATABASE_NAME = "keepTab";
const TAB_STORE = "TabStore";
const IMAGE_STORE = "ImageStore";
const SESSION_STORE = "SessionStore";
const IMAGE_INDEX = "ImageIndex";
const TAB_INDEX = "TabIndex";
const SESSION_INDEX = "SessionIndex";
const DB_VERSION = 1;
// IndexedDB
var indexedDB = window.indexedDB;
var db;
var open = indexedDB.open(DATABASE_NAME, DB_VERSION);
//Create schema
open.onupgradeneeded = upgradeDatabase;
open.onsuccess = function (event) {
  db = event.target.result;
};

/**
 * CRUD functions
 */

/**********CREATE**********/
/**
 * insertImageTab
 * @param {Object} imageTab - A tab with an image
 * @param {String} dataUrl	- The image url (base 64), BLOB
 */
function insertImageTab(imageTab, dataUrl) {
    var tx = db.transaction([IMAGE_STORE,TAB_STORE], "readwrite");
    var imageStore = tx.objectStore(IMAGE_STORE);
    var tabStore = tx.objectStore(TAB_STORE);
    imageStore.add({url: imageTab.tab.url, dataUrl: dataUrl});
    tabStore.add(imageTab.tab);
}

/**
 * insertSession
 * @param {Array} urls - List of urls in that session
 */
function insertSession(urls) {
    var tx = db.transaction(SESSION_STORE, "readwrite");
    var sessionStore = tx.objectStore(SESSION_STORE);
    sessionStore.add({urls: urls});
}

/**********READ**********/
/**
 * getSessionUrls
 * @param {String} sessionId - The id of the session, as a string.
 * @param {Function} callback - Callback with the urls
 */
function getSessionUrls(sessionId, callback) {
    var tx = db.transaction(SESSION_STORE, "readonly");
    var sessionStore = tx.objectStore(SESSION_STORE);
    var response = sessionStore.get(+sessionId);
    response.onsuccess = function () {
      callback(response.result.urls);
    };
	
}
/**
 * getSessionId
 * @param {Array} urls - A list of the urls in that session
 * @param {Function} callback - Callback with the sessionId
 */
function getSessionId(urls, callback) {
  var tx = db.transaction(SESSION_STORE, "readonly");
  var sessionStore = tx.objectStore(SESSION_STORE);
  console.log("URLS TEST: ", urls);
  var index = sessionStore.index(SESSION_INDEX).get(urls);
  index.onsuccess = function () {
    console.debug("ID:", index.result.id);
    callback(index.result.id);
  };
}
/**
 * getImage
 * @param {String} url - The url of the associated tab
 * @param {Function} callback - Callback with the dataUrl 
 */
function getImage(url, callback) {
	var tx = db.transaction(IMAGE_STORE, "readonly");
	var imageStore = tx.objectStore(IMAGE_STORE);
	var response = imageStore.get(url);
	response.onsuccess = function () {
		callback(response.result.dataUrl);
	};
}
/**
 * 
 * @param {String} url - The url of the associated tab
 * @param {Function} callback - Callback with the tab object
 */
function getTab(url, callback) {
	var tx = db.transaction(TAB_STORE, "readonly");
	var tabStore = tx.objectStore(TAB_STORE);
	var response = tabStore.get(url);
	response.onsuccess = function () {
		callback(response.result);
	};
}

/**********UPDATE**********/
/**
 * addUrlToSession
 * @param {String} sessionId - The id of the session 
 * @param {String} url - The url you want to add
 * @param {Function} callback - Callback with the urls
 */
function addUrlToSession(sessionId, url, callback) {
  getSessionUrls(sessionId, function (urls) {
    urls.push(url);
    var tx = db.transaction(SESSION_STORE, "readwrite");
    var sessionStore = tx.objectStore(SESSION_STORE);
    sessionStore.put({urls: urls, id: +sessionId});
    callback(urls);
  });
}

/**********DELETE**********/
/**
 * removeSession
 * @param {String} sessionId - The id of the session you want to remove
 */
function removeSession(sessionId, callback) {
	console.debug("SESSION", sessionId);
  	var tx = db.transaction(SESSION_STORE, "readwrite");
  	var sessionStore = tx.objectStore(SESSION_STORE);
  	var request = sessionStore.delete(parseInt(sessionId));
	request.onsuccess = function () {
		if (callback !== undefined) {
			callback();
		}		
	};
	request.onerror = function () {
		console.error("Error deleting session");
	};
}

function removeImage(url) {
	var tx = db.transaction(IMAGE_STORE, "readwrite");
	var imageStore = tx.objectStore(IMAGE_STORE);
	imageStore.delete(url);
}

function removeTab(url) {
	var tx = db.transaction(TAB_STORE, "readwrite");
	var tabStore = tx.objectStore(TAB_STORE);
	tabStore.delete(url);	
}

function removeUrlFromSession(sessionId, url) {
	getSessionUrls(sessionId, function (urls) {
		urls.remove(url);
		var tx = db.transaction(SESSION_STORE, "readwrite");
		var sessionStore = tx.objectStore(SESSION_STORE);
		sessionStore.put({urls: urls, id: +sessionId});
	});
}


/**
 * MISC
 */
function upgradeDatabase(event) {
	console.log("Create schema");
	db = event.target.result;
	imageStore = db.createObjectStore(IMAGE_STORE, {keyPath: "url"});
  	tabStore = db.createObjectStore(TAB_STORE, {keyPath: "url"});
  	sessionStore = db.createObjectStore(SESSION_STORE, {keyPath: "id", autoIncrement: true });
	imageIndex = imageStore.createIndex(IMAGE_INDEX, "url");
  	tabIndex = tabStore.createIndex(TAB_INDEX, "url");
  	sessionIndex = sessionStore.createIndex(SESSION_INDEX, "urls");
}

Array.prototype.remove = function (item) {
	if (this == null) throw new TypeError('"this" is null or not defined');
	var index = this.indexOf(item);
	if (index > -1) {
		this.splice(index, 1);
	}
};