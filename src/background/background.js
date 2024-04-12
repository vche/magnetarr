"use strict";
import * as browser from 'webextension-polyfill';
import {getProviderFromUrl} from "../lib/provider";

function handlePageAction(tabInfo) {
  browser.tabs.query({active:true,currentWindow:true}).then((tabArray) => {
    if ((tabArray[0])&&(getProviderFromUrl(tabArray[0].url))) {
      browser.action.enable(tabInfo.tabId);
    } else {
      browser.action.disable(tabInfo.tabId);
    }
  });    
}

// Register our page parser when a tab gets activated and when a page gets loaded
browser.tabs.onActivated.addListener(handlePageAction);
browser.webNavigation.onCommitted.addListener(handlePageAction);
