let navbar = document.querySelector('.header .navbar');
let menuBtn = document.querySelector('#menu-btn');

menuBtn.onclick = () =>{
   menuBtn.classList.toggle('fa-times');
   navbar.classList.toggle('active');
};

window.onscroll = () =>{
   menuBtn.classList.remove('fa-times');
   navbar.classList.remove('active');
};

// Get the modal
var modal = document.getElementById("myModal");
var tableModal = document.getElementById("tableModal");

// Get the button that opens the modal
var btn = document.getElementsByClassName("checkout")[0];
var btn2 =document.getElementsByClassName("checkout")[1];

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];
var span2 = document.getElementsByClassName("close")[1];

//Get element that shows confirmation text
var confirmation =document.getElementsByClassName("textConfirm")[0];
var confirmation1 = document.getElementsByClassName("textConfirm")[1];

//Get Place Order Button
var placeOrder = document.getElementsByClassName("order")[0];
var placeOrder1 = document.getElementsByClassName("order")[1];

//When user click place order the confirmation text will show
placeOrder.onclick=function()
{
   confirmation.style.display = "block"
}

placeOrder1.onclick = function ()
{
   confirmation1.style.display = "block";
}

// When the user clicks the button, open the modal 
btn.onclick = function() 
{
  modal.style.display = "block";
}

btn2.onclick = function()
{
   tableModal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
  confirmation.style.display = "none";

}


span2.onclick = function ()
{
   tableModal.style.display ="none";
   confirmation1.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

