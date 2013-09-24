// bilingual? please help translate Boston's Election App

// if you're on GitHub: make a pull request to https://github.com/CityOfBoston/elect-app/
// want to e-mail a translation? Contact nick.doiron@cityofboston.gov

var translations = {
  "^(en)": {
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
  },
  "^(es)": {
    pollingplaces: "Centros de Votación",
    directions: "Cómo Llegar",
    mydirections: "Mi Ruta para llegar",
    cleartext: "Borrar contenido",
    search: "Búsqueda",
    close: "Cerrar",
    uselocation: "Utilizar mi ubicación",
    walk: "Andar",
    drive: "Manejar",
    transit: "Transporte Público",
    entrance: "Entrada",
    feedback: "Envíar Comentarios",
    restart: "Reiniciar Búsqueda",
    welcome: "Bienvenidos al Mapa de Centros de Votación de Boston",
    enteraddress: "Ingrese su dirección para encontrar su centro de votación"
  },
  "^(de)": {
    pollingplaces: "Wahllokale",
    directions: "Route",
    mydirections: "Meine Route",
    cleartext: "Text löschen",
    search: "Suche",
    close: "Schließen",
    uselocation: "Meine Position",
    walk: "Laufen",
    drive: "Auto",
    transit: "Bus+Bahn",
    entrance: "Eingang",
    feedback: "Feedback senden",
    restart: "Erneut suchen",
    welcome: "Willkommen zu Bostons Wahllokal-Karte",
    enteraddress: "Geben Sie Ihre Adresse ein, um Ihr Wahllokal zu finden"
  },
  "^(cn|zh)": {
    pollingplaces: "投票站",
    directions: "路線",
    mydirections: "我的指示",
    cleartext: "清除內容",
    search: "搜索",
    close: "關閉",
    uselocation: "用我所在地",
    walk: "步行",
    drive: "駕駛",
    transit: "公共交通",
    entrance: "入口",
    feedback: "分享意見",
    restart: "重新搜索",
    welcome: "歡迎瀏覽波士頓投票站地圖",
    enteraddress: "為方便找您的投票站，請輸入您的家庭住址"
  },
  "^(vi)": {
    pollingplaces: "Địa điểm bỏ phiếu",
    directions: "Lối đi",
    mydirections: "Lối đi của tôi",
    cleartext: "Xóa",
    search: "Tìm",
    close: "Đóng",
    uselocation: "Dùng vị trí của tôi",
    walk: "Đi bộ",
    drive: "Lái xe",
    transit: "Lưu Thông Công Cộng",
    entrance: "Lối vào",
    feedback: "Cho ý kiến",
    restart: "Khởi động lại",
    welcome: "Chào mừng quý vị đến bản đồ địa điểm bỏ phiếu của TP Boston",
    enteraddress: "Nhập địa chỉ nhà của quý vị tìm địa điểm bỏ phiếu của quý vị"
  },
  "^(ht)": {
    pollingplaces: "Biwo Vòte",
    directions: "Direksyon",
    mydirections: "Direksyon m '",
    cleartext: "Efase",
    search: "Chèche",
    close: "Fèmen",
    uselocation: "Sèvi ak kote mwen an",
    walk: "Mache",
    drive: "Kondwi",
    transit: "Transpò Piblik",
    entrance: "Antre",
    feedback: "Voye Fidbak",
    restart: "Rekòmanse Rechèch",
    welcome: "Byenveni nan biwo vòte nan Boston kat jeyografik",
    enteraddress: "Ekri adrès lakay ou pou jwenn biwo vòte ou an"
  }
};

$(document).ready(function(){
  var userLang = getURLVar("lang") || window.navigator.userLanguage || window.navigator.language;
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
});

function getURLVar(nm){nm=nm.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");var rxS="[\\?&]"+nm+"=([^&#]*)";var rx=new RegExp(rxS);var rs=rx.exec(window.location.href.toLowerCase());if(!rs){return null;}else{return rs[1];}}
