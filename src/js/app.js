// import Web3 from  '../../node_modules/web3/src/index.js';
// let TruffleContract = require('truffle-contract');
App = {
  web3Provider: null,
  web3: {},
  contracts: {},
  account: '0x0',
  tokenInstance: {},
  tcrInstance: {},

  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
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

  initContract: function() {
    $.getJSON("Tcr.json", function(tcr) {
      // Instantiate a new truffle contract from the artifact
      let abi = tcr.abi;
      console.log(App.web3);
      App.tcrInstance = new App.web3.eth.Contract(abi, "0x579b788b1adAe0236d3BF4766163879b4b2Bb252");
      // Connect provider to interact with contract
      App.tcrInstance.setProvider(App.web3Provider);
    }).then(function(){
      $.getJSON("Token.json", function(token) {
        let abi = token.abi;
        App.tokenInstance = new App.web3.eth.Contract(abi, "0xF5D1D9bc11Ff0B3238A4251F8e8F2dcC9e428EAb");
        // Connect provider to interact with contract
        App.tokenInstance.setProvider(App.web3Provider);
        return App.render();
      });
    });    
  },

  render: function() {
    // var tcrInstance;
    var loader = $("#loader");
    var content = $("#content");

    loader.show();
    content.hide();
    var ethereum = window.ethereum;
    ethereum.enable().then(function(accounts){
      console.log(accounts);
      App.account = accounts[0];
      App.tcrInstance.options.from = App.account;
      App.tokenInstance.options.from = App.account;
    });
    
    // App.contracts.Token.deployed().then(function(instance) {
    //   App.tokenInstance = instance;
    // });

    // Load contract data
    App.tcrInstance.methods.getAllListings().call().then(function(l){
      let listings = [];
      for(let i=0; i<l[0].length; i++) {
        listings.push([l[0][i], l[1][i], l[2][i]]);
      }
      console.log(listings);
      
    });
    // console.log(listings);
    // App.contracts.Tcr.options.data = {}
    // App.contracts.Tcr.deploy().then(function(instance) {
    //   console.log("Hello");
    //   App.tcrInstance = instance;
    //   console.log(App.tcrInstance.address);
    //   // return App.tcrInstance.getListingDetails("0x3136443037303035354545343735000000000000000000000000000000000000");
    //   // return App.tcrInstance.getDetails();
    //   let listings = App.tcrInstance.getAllListings.call();
    //   return listings;
    //   // return 10;
    // }).then(function(minDeposit) {
    //   var candidatesResults = $("#candidatesResults");
    //   candidatesResults.empty();
    //   console.log(minDeposit[0]);
    //   // for (var i = 1; i <= candidatesCount; i++) {
    //   //   electionInstance.candidates(i).then(function(candidate) {
    //   //     var id = candidate[0];
    //   //     var name = candidate[1];
    //   //     var voteCount = candidate[2];

    //   //     // Render candidate Result
    //   //     var candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>"
    //   //     candidatesResults.append(candidateTemplate);
    //   //   });
    //   // }

    //   loader.hide();
    //   content.show();
    // }).catch(function(error) {
    //   console.warn(error);
    // });
  },

  propose: function() {
    // var candidateId = $('#candidatesSelect').val();
    console.log("address", App.tcrInstance.options.address);
    console.log(App.account);
    App.tokenInstance.methods.approve(App.tcrInstance.options.address, 10000).send()
    .then(function(r){
      App.tcrInstance.methods.propose(200, "16D070022", "EE222", "nnopasce", 4).send();
    });
    


  //   App.contracts.Tcr.deployed().then(function(instance) {
  //     return instance.vote(candidateId, { from: App.account });
  //   }).then(function(result) {
  //     // Wait for votes to update
  //     $("#content").hide();
  //     $("#loader").show();
  //   }).catch(function(err) {
  //     console.error(err);
  //   });
  }

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});