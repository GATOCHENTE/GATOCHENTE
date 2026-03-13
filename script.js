document.getElementById("year").textContent =
"© " + new Date().getFullYear() + " GATOCHENTE";

const search = document.getElementById("search");

function clearHighlight(){

document.querySelectorAll("p, h1, h2, h3").forEach(el=>{

el.style.background="none";

});

}

search.addEventListener("input", function(){

let value = this.value.toLowerCase();

if(value === ""){

clearHighlight();

}else{

document.querySelectorAll("p, h1, h2, h3").forEach(el=>{

if(el.textContent.toLowerCase().includes(value)){

el.style.background="yellow";

}else{

el.style.background="none";

}

});

}

});

search.addEventListener("blur", function(){

clearHighlight();
this.value = "";

});

if("serviceWorker" in navigator){

navigator.serviceWorker.register("service-worker.js")

}