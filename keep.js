//TODO: Add functionality to have saved sessions
var tabs = chrome.extension.getBackgroundPage().tempTabs;
var background = chrome.extension.getBackgroundPage();
var previewDialog = document.querySelector('#tabPreview');
var renameDialog = document.querySelector('#renameDialog');
var sessionId = (new URLSearchParams(window.location.search)).get('session');
console.debug("SESSION ID: ", sessionId);
background.getSessionUrls(sessionId, function (urls) {
	for (url of urls) {
		constructImageTab(url, function (imageTab) {
			console.debug("IMAGE TAB: ", imageTab);
			createTabEl(imageTab);
		});
	}
});

initListeners();
/**
 * initListeners:
 * Sets all the listeners in the document
 */
function initListeners() {
	//Preview Dialog
	previewDialog.addEventListener('mouseover', showPreview);
	previewDialog.addEventListener('mouseout', hidePreview);
	previewDialog.addEventListener('click', hidePreview);

	//Rename Dialog
	renameDialog.querySelector('.confirm').addEventListener('click', renameTitle);
	renameDialog.querySelector('.close').addEventListener('click', function() {
		renameDialog.close();
	});
	document.querySelector('#rename').addEventListener('click', function (e) {
		renameDialog.showModal();
	});	
}

/**
 * createTabEl:
 * Inserts a new tab card into the document using the given imageTab object
 * @param {Object} imageTab - An object containing the Tab object and an image url for the thumbnail
 */
function createTabEl(imageTab) {
	//Template
	var cardT = document.querySelector('#tabCardTemplate');

	//Tab Card
	var tabCard = document.importNode(cardT.content, true);
	var cardBase = tabCard.querySelector('div');
	cardBase.id = "tab-" + imageTab.tab.id;
	cardBase.addEventListener('click', showPreview);
	tabCard.querySelector('#cardTitle').innerHTML = imageTab.tab.title;
	tabCard.querySelector('#cardContent').innerHTML = imageTab.tab.url;
	// Action Button
	var cardAction = tabCard.querySelector('#cardAction');
	cardAction.setAttribute('href', imageTab.tab.url);
	cardAction.addEventListener('click', deleteWithId);
	cardAction.dataset.cardId = "tab-" + imageTab.tab.id;
	// Close Button
	var cardClose = tabCard.querySelector('#cardClose');
	cardClose.dataset.cardId = "tab-" + imageTab.tab.id;
	cardClose.addEventListener('click', deleteWithId);
	// Header
	var cardHeader = tabCard.querySelector('#cardHeader');
	cardHeader.style.backgroundColor = "#e0e0e0";
	cardHeader.style.backgroundRepeat = "no-repeat";
	cardHeader.style.backgroundImage = "url(\'" + imageTab.imageUrl + "\')";
	cardHeader.style.backgroundSize = "contain";
	cardHeader.style.backgroundPosition = "top center";

	document.querySelector('#tabCards').appendChild(tabCard);
}
/**
 * renameTitle:
 * Renames the title of the current tab
 */
function renameTitle() {
	var newTitle = renameDialog.querySelector('#newTitle').value;
	document.title = newTitle;
	renameDialog.close();
}
/**
 * deleteCard:
 * Deletes the card from the DOM, then removes it from the DB
 * @param {String} id - The id of the tab you want to delete
 */
function deleteCard(id) {
	var parent = document.querySelector('#tabCards');
	var child = document.querySelector('#' + id);
	var url = child.querySelector('#cardContent').innerHTML;
	parent.removeChild(child);
	background.removeImage(url);
	background.removeTab(url);
	background.removeUrlFromSession(sessionId, url);
	if (parent.children.length == 0) {
		//! It won't delete the record for some stupid reason. It works in the background
		//! page, but not this script. Super confusing.
		if (confirm("There are no tabs to keep. Close Window?")) {
			background.removeSession(sessionId, function () {
				window.close();
			});
		}		
	}
}
/**
 * deleteWithId:
 * Gets the id of the tab card, then removes the card and related db stuff
 * @param {Object} e - The event 
 */
function deleteWithId(e) {
	//Parentnode takes care of the 'ripple' child
	var id = e.target.parentNode.dataset.cardId;
	deleteCard(id);
	hidePreview(e);
}
/**
 * showPreview:
 * Shows the tab preview popup
 * @param {Object} e - The event 
 */
function showPreview(e) {
	var previewImgContainer = e.target.querySelector('.preview');
	if ((previewImgContainer == null && e.target.id == 'cardHeader')) {
		previewImgContainer = e.target;
	} else if(previewImgContainer == null || e.target.id == 'cardAction') {
		console.info('Hid the preview');
		return;
	}
	previewDialog.show();
	var image = document.querySelector('#previewImage');
	image.style.backgroundImage = previewImgContainer.style.backgroundImage;
}
/**
 * hidePreview:
 * Hides the tab preview popup
 * @param {Object} e - The event 
 */
function hidePreview(e) {
	try {
		previewDialog.close();
	} catch(ex) {
		//Empty because I don't want to see all the DOMExceptions
	}
}

/**
 * constructImageTab: 
 * Makes an imageTab object out of the tab image and tab object.
 * @param {String} url - The url of the tab
 * @param {Function} callback - Callback with the newly created imageTab object
 */
function constructImageTab(url, callback) {
	var imageTab = {};
	background.getImage(url, function (dataUrl) {
		imageTab.imageUrl = dataUrl;
		background.getTab(url, function (tab) {
			imageTab.tab = tab;
			callback(imageTab);
		});
	});
}