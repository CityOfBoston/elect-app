var translations = {
  "en*": {
    pollingplaces: "Polling Places",
    directions: "Directions",
    mydirections: "My Directions",
    cleartext: "Clear Text",
    search: "Search",
    close: "Close",
    uselocation: "Use My Location",
    walk: "Walk",
    drive: "Drive",
    transit: "Transit",
    entrance: "Entrance",
    feedback: "Send Feedback",
    restart: "Restart Search",
    welcome: "Welcome to Boston's Polling Places Map",
    enteraddress: "Enter your home address to find your polling place"
  }
};

var userLang = window.navigator.userLanguage || window.navigator.language;
if(userLang){
  userLang = userLang.toLowerCase();
  for(var lang in translations){
    var langreg = new RegExp(lang);
    if(langreg.test(userLang)){
      for(var label in translations[lang]){
        $(".label_" + label).text( translations[lang][label] );
      }
      break;
    }
  }
}