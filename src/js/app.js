// import Web3 from  '../../node_modules/web3/src/index.js';
// let TruffleContract = require('truffle-contract');


let oneReviewDiv = function({roll, review, rating, lHash, wl}){
  return(
    `<div class="row hoverable">
        <div class="col s2">${roll}</div>
        <div class="col s4">${review}</div>
        <div class="col s1">${rating}</div>
        <div class="col s1">${wl}</div>
        <div class="col s4">${lHash}</div>
    </div>`
  );
}

let getCHeader = function(a,b,c){
  return (
    `<div class="collapsible-header row">
                        <div class="col s4">${a}</div>
                        <div class="col s4">${b}</div>
                        <div class="col s4">${c}</div>
                      </div>`
  );
}

App = {
  web3Provider: null,
  web3: {},
  contracts: {},
  account: '0x0',
  tokenInstance: {},
  tcrInstance: {},

  init: function () {
    return App.initWeb3();
  },

  initWeb3: function () {
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      App.web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
      App.web3 = new Web3(App.web3Provider);
    }
    // App.web3 = web3;
    return App.initContract();
  },

  initContract: function () {
    $.getJSON("Tcr.json", function (tcr) {
      // Instantiate a new truffle contract from the artifact
      let abi = tcr.abi;
      console.log(App.web3);
      App.tcrInstance = new App.web3.eth.Contract(abi, "0x2660c458C6f90d2EbA26A478c0e90d329075a0E2");
      // Connect provider to interact with contract
      App.tcrInstance.setProvider(App.web3Provider);
      //App.listenForEvents();


    }).then(function () {
      $.getJSON("Token.json", function (token) {
        let abi = token.abi;
        App.tokenInstance = new App.web3.eth.Contract(abi, "0x1baFDfC807e402Ca92993b874B83b5Ce49e571c7");
        // Connect provider to interact with contract
        App.tokenInstance.setProvider(App.web3Provider);
        return App.render();
      });
    });
  },

  render: function () {
    // var tcrInstance;
    var loader = $("#loader");
    var content = $("#content");

    loader.show();
    content.hide();
    var ethereum = window.ethereum;
    ethereum.enable().then(function (accounts) {
      console.log(accounts);
      App.account = accounts[0];
      console.log("Assigned - ",App.account);
      App.tcrInstance.options.from = App.account;
      App.tokenInstance.options.from = App.account;
    });

    // App.contracts.Token.deployed().then(function(instance) {
    //   App.tokenInstance = instance;
    // });

    // Load contract data
    let courses = {};
    // let listings = []];

    
    App.tcrInstance.methods.getAllListings().call().then(function (l) {
      for (let i = 0; i < l[0].length; i++) {
        let item = {};
        let rev = l[0][i].split(' ');
        item = {
          'roll': rev[0],
          'review': rev[2],
          'rating': rev[3],
          'lHash': l[1][i],
          'wl' : l[2][i],             
        } ;
        if(courses[rev[1]]){
          let avg = courses[rev[1]].avgRating;
          let nR = courses[rev[1]].numRatings;
          courses[rev[1]].avgRating = (avg*nR + parseFloat(rev[3]))/(nR +1);
          courses[rev[1]].numRatings = nR +1;
          courses[rev[1]].data.push(item);
        }else{
          courses[rev[1]] = {
            'avgRating' : parseFloat(rev[3]),
            'numRatings' : 1,
            'data': [item],
          };
        }
      }
      console.log(courses);
      var reviewList = $(".collapsible");
      reviewList.empty();
      // console.log(minDeposit[0]);
      Object.keys(courses).forEach(function(key) {
        let cHeader = getCHeader(key, courses[key].avgRating, courses[key].numRatings);
        let reviewDivs = [];
        courses[key].data.forEach(function(item){
            reviewDivs.push(oneReviewDiv(item))
        });
        
        let cBody = "<div class=\"collapsible-body\">" + reviewDivs.join()+"</div>"
        reviewList.append(`<li>${cHeader}${cBody}</li>`);
      });
      loader.hide();
      content.show();
      
      $(document).ready(function(){
        $('.collapsible').collapsible();
      });

    });
    // console.log("1");
    // console.log(App.account);
    // App.tokenInstance.methods.balanceOf("0x9AeCa19490FE0b4FF3Bbd021c9e7929beDa4BA77").call().then(console.log);
    // console.log("2");
    // console.log(listings);
    // App.contracts.Tcr.options.data = {}
    // App.contracts.Tcr.deploy().then(function(instance) {
    //   console.log("Hello");
    //   App.tcrInstance = instance;
    //   console.log(App.tcrInstance.address);
    // }).catch(function(error) {
    //   console.warn(error);
    // });
  },

  propose: async function () {
    // var candidateId = $('#candidatesSelect').val();
    console.log("address", App.tcrInstance.options.address);
    console.log(App.account);
    let roll = $('#roll').val();
    let course_code = $('#course').val();
    let  review = $('#review').val();
    let amount = $('#amount').val();
    let rating = $('#rating').val();
    console.log(amount);

    App.tokenInstance.methods.approve(App.tcrInstance.options.address, 10000)
    .send(function(r){
      App.tcrInstance.methods.propose(amount, roll, course_code, review, rating).send(console.log);
    });  
    

  },

  challenge: function () {
    App.tokenInstance.approve(App.tcrInstance.address, 10000, { from: App.account });

    let hash = $('#hash').val();
    let amount = $('#challenge_amount').val();

    console.log(amount);
    App.tcrInstance.methods.challenge(hash, amount);

  },

  vote: function () {
    App.tokenInstance.approve(App.tcrInstance.address, 10000, { from: App.account });

    let hash = $('#VoteHash').val();
    let amount = $('#VoteAmount').val();
    let choice = $('#Vote').val();

    console.log(amount);
    App.tcrInstance.methods.vote(hash, amount, choice);

  },

  /*,
  listenForEvents: function() {

        instance._Application({}, {
          fromBlock: 0,
          toBlock: 'latest'
        }).watch(function(error, event) {
          console.log("New application", event)
          //alert("I am an alert box!");
          // Reload when a new vote is recorded
          App.render();
        });

        instance._Challenge({}, {
          fromBlock: 0,
          toBlock: 'latest'
        }).watch(function(error, event) {
          console.log("New challenge", event)
          //alert("I am an alert box!");
          // Reload when a new vote is recorded
          App.render();
        });

        instance._Vote({}, {
          fromBlock: 0,
          toBlock: 'latest'
        }).watch(function(error, event) {
          console.log("New vote", event)
          //alert("I am an alert box!");
          // Reload when a new vote is recorded
          App.render();
        });

        instance._ResolveChallenge({}, {
          fromBlock: 0,
          toBlock: 'latest'
        }).watch(function(error, event) {
          console.log("New challenge", event)
          //alert("I am an alert box!");
          // Reload when a new vote is recorded
          App.render();
        });

        instance._RewardClaimed({}, {
          fromBlock: 0,
          toBlock: 'latest'
        }).watch(function(error, event) {
          console.log("New challenge", event)
          //alert("I am an alert box!");
          // Reload when a new vote is recorded
          App.render();
        });

  }*/

};

$(function () {
  $(window).load(function () {
    App.init();
  });
});