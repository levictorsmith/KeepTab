//TODO: Add functionality to have saved sessions
var tabs = chrome.extension.getBackgroundPage().tempTabs;
var previewDialog = document.querySelector('#tabPreview');
var renameDialog = document.querySelector('#renameDialog');


if (!tabs || tabs.length == 0) {
	chrome.tabs.getCurrent(function (current) {
		tabs = JSON.parse(sessionStorage.getItem('keepTab-' + current.id));
		console.log(tabs);
		for (imageTab of tabs) {
			console.log("Creating nodes");
			createTabEl(imageTab);
		}		
	});
} else {
	console.log(tabs);
	for (imageTab of tabs) {
		console.log("Creating nodes");
		createTabEl(imageTab);
	}
}
chrome.tabs.getCurrent(function (current) {
	//TODO: Maybe DON'T save the entire imageTab array. That's a crap ton of binary data.
	//? Perhaps have a WebSQL cache or IndexedDB?
	
	
	chrome.extension.getBackgroundPage().tempTabs = [];
	chrome.runtime.onMessage.addListener(getAllKeptTabs);	
});


initListeners();
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
 * 
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
 * getAllKeptTabs: Returns an array of the tabs that are being kept on this page
 * @param {Object} request 
 * @param {Object} sender 
 * @param {Object} sendResponse 
 */
function getAllKeptTabs(request, sender, sendResponse) {
	if (request.command == "getAllKeptTabs") {
		var imageTabs = [];
		var cards = document.querySelectorAll('.square-card');
		cards.forEach(function (card) {
				imageTabs.push(parseImageCard(card));
		});
		sendResponse({imageTabs: imageTabs});
	} else {
		console.warn("Request received, but not from expected source");
	}
}

/**
 * parseImageCard: Gets the imageTab info from a card in the document
 * @param {Node} card - The image card with the kept tab
 */
function parseImageCard(card) {
	var imageTab = {};
	imageTab.tab = {};
	//The tab id isn't really that important here, but since we are assuming that it has one, we need to put it there.
	imageTab.tab.id = Number(card.id.substring(4));
	imageTab.tab.title = card.querySelector("#cardTitle").innerHTML;
	imageTab.tab.url = card.querySelector("#cardContent").innerHTML;
	//This has url("") surrounding the actual url, so we need to remove it.
	var imageUrl = card.querySelector('#cardHeader').style.backgroundImage;
	imageTab.imageUrl = imageUrl.substring(5, imageUrl.length - 2);
	return imageTab;
}

function renameTitle() {
	var newTitle = renameDialog.querySelector('#newTitle').value;
	document.title = newTitle;
	renameDialog.close();
}

function deleteCard(id) {
	chrome.tabs.getCurrent(function (current) {
		var parent = document.querySelector('#tabCards');
		var child = document.querySelector('#' + id);
		id = Number(id.replace('tab-',""));
		var index = tabs.findIndex(function (imageTab) {
			return imageTab.tab.id == id;
		});
		if (index != -1) {
			//TODO: Maybe DON'T save the entire imageTab array. That's a crap ton of binary data.
			//? Perhaps have a WebSQL cache or IndexedDB?
			tabs.splice(index, 1);
			sessionStorage.setItem('keepTab-' + current.id, JSON.stringify(tabs));
			parent.removeChild(child);			
		}
	});
}

function deleteWithId(e) {
	//Parentnode takes care of the 'ripple' child
	var id = e.target.parentNode.dataset.cardId;
	deleteCard(id);
	hidePreview(e);
}

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

function hidePreview(e) {
	try {
		previewDialog.close();
	} catch(ex) {
		//Empty because I don't want to see all the DOMExceptions
	}
}