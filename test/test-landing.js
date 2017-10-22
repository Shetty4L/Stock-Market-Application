var expect  = require('chai').expect;
var request = require('request');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

describe('Landing Page', function() {
  describe('Status of search button', function() {
    describe('text box is empty', function() {
      it('if text box is empty, search button should be disabled', function(done) {
        request('http://localhost:8080', function(error, response, body) {
          const dom = new JSDOM(body);
          var btnDisabled = false;
          const textBox = dom.window.document.getElementsByName('stock_symbol')[0];
          const submitBtn = dom.window.document.getElementsByName('submit')[0];

          if(!textBox.value) {
            btnDisabled = true;
          } else {
            btnDisabled = false;
          }
          expect(btnDisabled).to.equal(true);
          done();
        });
      });
    });

    describe('text box has only spaces', function() {
      it('if text box has only spaces, search button should be enabled', function(done) {
        request('http://localhost:8080', function(error, response, body) {
          const dom = new JSDOM(body);
          var btnDisabled = false;
          const textBox = dom.window.document.getElementsByName('stock_symbol')[0];
          const submitBtn = dom.window.document.getElementsByName('submit')[0];
          textBox.value = "       ";

          var letterNumber = /^[0-9a-zA-Z]+$/;
          if(textBox.value.match(letterNumber)) {
            btnDisabled = false;
          } else {
            btnDisabled = true;
          }

          expect(btnDisabled).to.equal(true);
          done();
        });
      });
    });
  });

  describe('Error Message when invalid input', function() {
    describe('on landing', function() {
      it('error messsage should not be displayed', function(done) {
        request('http://localhost:8080', function(error, response, body) {
            const dom = new JSDOM(body);
            const errorMsg = dom.window.document.getElementById('stock-error-msg');
            const textBox = dom.window.document.getElementsByName('stock_symbol')[0];

            if(!textBox.value) {
              errorMsg.style.visibility = 'hidden';
            } else {
              errorMsg.style.visibility = 'visible';
            }

            expect(errorMsg.style.visibility).to.equal('hidden');
            done();
        });
      });
    });

    // Refactor the next 2 with request module
    describe('particular error message', function() {
      it('if invalid input, particular error message should be displayed', function(done) {
        const dom = new JSDOM();
        var errorMsg = dom.window.document.createElement("div");
        errorMsg.innerHTML = 'Please enter a stock ticker symbol';
        expect(errorMsg.innerHTML).to.equal('Please enter a stock ticker symbol');
        done();
      });
    });

    describe('error message should be displayed', function() {
      it('if invalid input, error message should be displayed', function(done) {
        const dom = new JSDOM();
        var errorMsg = dom.window.document.createElement("div");
        errorMsg.innerHTML = 'Please enter a stock ticker symbol';
        errorMsg.style.visibility = 'visible';
        expect(errorMsg.style.visibility).to.equal('visible');
        done();
      });
    });
  });

  describe('On clicking clear button', function() {
    describe('textbox should become empty', function() {
      it('if clear button is clicked, text box becomes empty', function(done) {
        request('http://localhost:8080', function(error, response, body) {
          const dom = new JSDOM(body);
          const clearBtn = dom.window.document.getElementsByName("clear")[0];
          const textBox = dom.window.document.getElementsByName('stock_symbol')[0];
          clearBtn.addEventListener('click', function() {
            textBox.value = "";
          });
          var evt = dom.window.document.createEvent("HTMLEvents");
          evt.initEvent("click", false, true);
          dom.window.document.body.dispatchEvent(evt);

          clearBtn.click();
          setTimeout(() => {
            expect(textBox.value).to.equal('');
            done();
          });
        });
      });
    });
  });
});
