var zango = require('zangodb');

//Set up Database
const DATABASE_NAME = "KeepTab";
const TABS_COLLECTION = "Tabs";
const IMAGES_COLLECTION = "Images";
const SESSIONS_COLLECTION = "Sessions";
const DB_VERSION = 1;
Array.prototype.remove = function (item) {
	if (this == null) throw new TypeError('"this" is null or not defined');
	var index = this.indexOf(item);
	if (index > -1) {
		this.splice(index, 1);
	}
};
module.exports = {
	db: new zango.Db(DATABASE_NAME, { 
		[TABS_COLLECTION]: ["url"],
		[IMAGES_COLLECTION]: ["url"],
		[SESSIONS_COLLECTION]: ["urls"]
	}),
	/**
	 * CRUD functions
	 */

	/**********CREATE**********/
	/**
	 * insertImageTab
	 * @param {Object} imageTab - A tab with an image
	 * @param {String} dataUrl	- The image url (base 64), BLOB
	 */
	insertImageTab: function(imageTab, dataUrl) {
		let tabs = this.db.collection(TABS_COLLECTION);
		let images = this.db.collection(IMAGES_COLLECTION);
		tabs.insert(imageTab.tab);
		images.insert({url: imageTab.tab.url, dataUrl: dataUrl});
	},
	/**
	 * insertSession
	 * @param {Array} urls - List of urls in that session
	 */
	insertSession: function(urls) {
		let sessions = this.db.collection(SESSIONS_COLLECTION);
		sessions.insert({urls: urls});
	},

	/**********READ**********/
	/**
	 * getSessionUrls
	 * @param {String} sessionId - The id of the session, as a string.
	 * @param {Function} callback - Callback with the urls
	 */
	getSessionUrls: function(sessionId, callback) {
		let sessions = this.db.collection(SESSIONS_COLLECTION);
		sessions.findOne({_id: +sessionId})
		.then((session) => {
			callback(session.urls);
		});
	},
	/**
	 * getSessionId
	 * @param {Array} urls - A list of the urls in that session
	 * @param {Function} callback - Callback with the sessionId
	 */
	getSessionId: function(urls, callback) {
		let sessions = this.db.collection(SESSIONS_COLLECTION);
		sessions.findOne({urls: urls})
		.then((session) => {
			callback(session._id);
		});
	},
	/**
	 * getImage
	 * @param {String} url - The url of the associated tab
	 * @param {Function} callback - Callback with the dataUrl 
	 */
	getImage: function(url, callback) {
		let images = this.db.collection(IMAGES_COLLECTION);
		images.findOne({url: url})
		.then((image) => {
			callback(image.dataUrl);
		});
	},
	/**
	 * 
	 * @param {String} url - The url of the associated tab
	 * @param {Function} callback - Callback with the tab object
	 */
	getTab: function(url, callback) {
		let tabs = this.db.collection(TABS_COLLECTION);
		tabs.findOne({url: url})
		.then((tab) => {
			callback(tab);
		});
	},

	/**********UPDATE**********/
	/**
	 * addUrlToSession
	 * @param {String} sessionId - The id of the session 
	 * @param {String} url - The url you want to add
	 * @param {Function} callback - Callback with the urls
	 */
	addUrlToSession: function(sessionId, url, callback) {
		let sessions = this.db.collection(SESSIONS_COLLECTION);
		this.getSessionUrls(sessionId, (urls) => {
			urls.push(url);
			sessions.update({_id: +sessionId}, {urls: urls});
			callback(urls);
		});
	},

	/**********DELETE**********/
	/**
	 * removeSession
	 * @param {String} sessionId - The id of the session you want to remove
	 */
	removeSession: function(sessionId) {
		let sessions = this.db.collection(SESSIONS_COLLECTION);
		sessions.remove({_id: +sessionId}, (error) => {
			if (error) throw error;
		});
	},
	/**
	 * removeImage
	 * @param {String} url - The url corresponding to the intended image
	 */
	removeImage: function(url) {
		let images = this.db.collection(IMAGES_COLLECTION);
		images.remove({url: url}, (error) => {
			if (error) throw error;
		});
	},
	/**
	 * removeTab
	 * @param {String} url - The url corresponding to the intended tab
	 */
	removeTab: function(url) {
		let tabs = this.db.collection(TABS_COLLECTION);
		tabs.remove({url: url}, (error) => {
			if (error) throw error;
		});
	},
	/**
	 * removeUrlFromSession
	 * @param {String} sessionId - The id of the session where the url resides
	 * @param {String} url - The url that you want to delete
	 */
	removeUrlFromSession: function(sessionId, url) {
		this.getSessionUrls(sessionId, (urls) => {
			urls.remove(url);
			let sessions = this.db.collection(SESSIONS_COLLECTION);
			sessions.update({_id: +sessionId}, {urls: urls});
		});
	}
};