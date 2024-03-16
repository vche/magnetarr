"use strict";
import {getProviderFromUrl} from "../lib/provider";

function handlePageAction(tabInfo) {
  chrome.tabs.query({active:true,currentWindow:true},function(tabArray){
    if ((tabArray[0])&&(getProviderFromUrl(tabArray[0].url))) {
        chrome.action.enable(tabInfo.tabId);
    } else {
        chrome.action.disable(tabInfo.tabId);
    }
  });
}

// Register our page parser when a tab gets activated and when a page gets loaded
chrome.tabs.onActivated.addListener(handlePageAction);
chrome.webNavigation.onCommitted.addListener(handlePageAction);
