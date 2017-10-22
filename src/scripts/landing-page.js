var textBox = document.getElementsByName('stock_symbol')[0];
textBox.onkeyup = function() {
  var submitBtn = document.getElementsByName('submit')[0];
  var errorMsg = document.getElementById('stock-error-msg');
  var letterNumber = /^[0-9a-zA-Z]+$/;
  if(textBox.value.match(letterNumber)) {
    submitBtn.disabled = false;
    errorMsg.style.visibility = 'hidden';
  } else {
    submitBtn.disabled = true;
    errorMsg.style.visibility = 'visible';
  }
};

var clearBtn = document.getElementsByName('clear')[0];
clearBtn.onclick = function() {
  textBox.value = "";  
};
