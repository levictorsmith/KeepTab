//TODO: Add functionality to have saved sessions
//TODO: Add 'Restore All' button
var previewDialog = document.querySelector('#tabPreview');
var renameDialog = document.querySelector('#renameDialog');
var sessionId = (new URLSearchParams(window.location.search)).get('session');
createAllCards(sessionId);

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

function createAllCards(sessionId) {
	chrome.runtime.sendMessage({function: "getSessionUrls", params: {sessionId: sessionId}}, function(response) {
		if (chrome.runtime.lastError) {
			console.error("Error! ", chrome.runtime.lastError);
		}
		for(url of response.urls) {
			constructImageTab(url, (imageTab) => {
				createCard(imageTab);
			});
		}
	});
}

/**
 * createTabEl:
 * Inserts a new tab card into the document using the given imageTab object
 * @param {Object} imageTab - An object containing the Tab object and an image url for the thumbnail
 */
function createCard(imageTab) {
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
	cardHeader.style.backgroundImage = "url(\'" + imageTab.imageUrl + "\')";

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
	//If trying to delete last one
	if (parent.children.length == 1) {
		if (confirm("There will be no tabs to keep. Close Window?")) {
			parent.removeChild(child);
			removeCardFromDB(sessionId, url, true);
		}		
	} else {
		parent.removeChild(child);
		removeCardFromDB(sessionId, url, false);
	}
}

function removeCardFromDB(sessionId, url, last) {
	chrome.runtime.sendMessage({function: "removeCard", params: {sessionId: sessionId, url: url, last: last}}, (response) => {
		if (response.last) {
			window.close();
		}
	});
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
	chrome.runtime.sendMessage({function: "getImageTab", params: {url: url}}, (response) => {
		callback(response.imageTab);
	});
}