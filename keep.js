var tabs = chrome.extension.getBackgroundPage().tempTabs;

var body = document.querySelector('body');
for (tab of tabs) {
   createTabEl(tab);
}
chrome.extension.getBackgroundPage().tempTabs = [];

function createTabEl(tab) {
   //Templates
   var titleT = document.querySelector('#tabTitleTemplate');
   var contentT = document.querySelector('#tabContentTemplate');

   //Elements
   var tabTitle = document.importNode(titleT.content, true).querySelector('a');
   tabTitle.innerHTML = tab.title;
   tabTitle.setAttribute('href', "#tab-" + tab.id);
   document.querySelector('#tabsTitles').appendChild(tabTitle);


   var tabContentContainer = document.importNode(contentT.content, true).querySelector('section');
   tabContentContainer.id = "tab-" + tab.id;
   var tabContent = tabContentContainer.querySelector('iframe');
   tabContent.setAttribute('src', tab.url);
   document.querySelector('#tabsContents').appendChild(tabContentContainer);
}

var main = document.querySelector('main');
var overlay = document.querySelector('#overlay');
var returnButton = document.querySelector('.return-button');
   main.addEventListener('mouseover', function (e) {
      overlay.style.display = "block";
      console.log(e.target.src);
      returnButton.style.display = 'flex';
      returnButton.setAttribute('href', e.target.src);
   });

main.addEventListener('mouseout', function (e) {
   returnButton.style.display = 'none';
   overlay.style.display = 'none';
});
