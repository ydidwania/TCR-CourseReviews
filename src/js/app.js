// import Web3 from  '../../node_modules/web3/src/index.js';
// let TruffleContract = require('truffle-contract');


let oneReviewDiv = function({roll, review, rating, lHash, wl}){
  let icon;
  let reload;
  if (wl){
    icon = "<i class=\"material-icons\ green-text\">verified_user</i>"
    reload = ``;
  } else if(App.challenges[lHash]){ // challenge going on
    icon = "<i class=\"material-icons\ red-text\">thumbs_up_down</i>"
    reload = `<div class="col s1" onClick=\"App.updateStatus(\'${lHash}\')\"><i class="material-icons black-text">refresh</i></div>`;
  } else{
    icon = "<i class=\"material-icons\ yellow-text\">watch_later</i>"
    reload = `<div class="col s1" onClick=\"App.updateStatus(\'${lHash}\')\"><i class="material-icons black-text">refresh</i></div>`;
  }

  return(
    `<div class="row hoverable">`
    +  reload
    +  `<div class="col s5">${review}</div>
        <div class="col s2">${rating} <i class="material-icons orange-text">star</i> </div>
        <div class="col s1">${icon}</div>
        <div class="col s3 tooltipped truncate copy_content" data-position="bottom" data-tooltip="Click to Copy">${lHash}</div>
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
  courses: {},
  challenges: {},
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
      App.tcrInstance = new App.web3.eth.Contract(abi, "0x2660c458C6f90d2EbA26A478c0e90d329075a0E2");
      // Connect provider to interact with contract
      App.tcrInstance.setProvider(App.web3Provider);
    }).then(function () {
      $.getJSON("Token.json", function (token) {
        let abi = token.abi;
        App.tokenInstance = new App.web3.eth.Contract(abi, "0x1baFDfC807e402Ca92993b874B83b5Ce49e571c7");
        // Connect provider to interact with contract
        App.tokenInstance.setProvider(App.web3Provider);
        
        return App.initMetamask();
      });
    });
  },

  initMetamask: function(){
    var ethereum = window.ethereum;
    ethereum.enable().then(function (accounts) {
      App.account = accounts[0];
      App.tcrInstance.options.from = App.account;
      App.tokenInstance.options.from = App.account;

      App.tcrInstance.methods.getDetails().call().then(function (details) {
        let appLen = parseInt(details[3]);
        console.log("Hello");
        // setInterval(App.updateStatus  , appLen*1000);
      });

      return App.readHistory();
    });
  },

  readHistory: function(){
    App.tcrInstance.getPastEvents('_Challenge',{fromBlock: 0,
      toBlock: 'latest'}, function(er,ev){
        ev.forEach(function(event){
          let lHash = event.returnValues[0];
          let cId = event.returnValues[1];
          App.challenges[lHash] = cId;
        }); 
      // use App.challenged to Display that the listing is under a poll 
    });
    
    App.tcrInstance.getPastEvents('_ResolveChallenge',{fromBlock: 0,
      toBlock: 'latest'}, function(er,ev){
        ev.forEach(function(event){
          let lHash = event.returnValues[0];
          delete App.challenges[lHash];
        });
      // if c_id does not exist in App.challenges then it is either resolved 
      // or never created.
    });
    //Hack below
    console.log("Reading History");
    setTimeout(App.render(),5000);// wait for 5s
    App.listenForEvents();
  },
  
  render: function () {
    // var tcrInstance;
    var loader = $("#loader");
    var content = $("#content");

    loader.show();
    content.hide();

    // Load contract data
    let courses = {};
    // let listings = []];
    
    App.tcrInstance.methods.getAllListings().call().then(function (l) {
      if(l==null){
        loader.hide();
        content.show();
        return;
      }
      for (let i = 0; i < l[0].length; i++) {
        let item = {};
        let rev = l[0][i].split('|');
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
      App.courses = courses;
      var reviewList = $(".collapsible");
      reviewList.empty();
      // console.log(minDeposit[0]);
      Object.keys(courses).forEach(function(key) {
        let cHeader = getCHeader(key, courses[key].avgRating, courses[key].numRatings);
        let reviewDivs = [];
        courses[key].data.forEach(function(item){
            reviewDivs.push(oneReviewDiv(item))
        });
        
        let cBody = "<div class=\"collapsible-body\">" + reviewDivs.join(' ')+"</div>"
        reviewList.append(`<li>${cHeader}${cBody}</li>`);
      });
      loader.hide();
      content.show();
      
      $(document).ready(function(){
        $('.collapsible').collapsible();
        $('.tooltipped').tooltip();
        $('.copy_content').click(function(e){
          var $temp = $("<input>");
          $temp.val(e.target.innerText);
          // var $temp = e.target;
          // $("body").append($temp);
          console.log($temp[0]);
          document.body.appendChild($temp[0]);
          $temp[0].select();
          document.execCommand("copy");
        });
      });

    });

  //   const filter = web3.eth.filter({
  //     address: App.tcrInstance.options.address,
  //   });
  //   filter.watch((error, result) => {
  //     console.log("Result", result);
  //  })
    
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
    App.tcrInstance.methods.propose(amount, roll, course_code, review, rating).send(console.log)
    .on('error',function(error){alert("Failed")})
    });  
  },

  challenge: async function () {
    let hash = $('#hash').val();
    let amount = $('#challenge_amount').val();
    App.tokenInstance.methods.approve(App.tcrInstance.options.address, 10000)
    .send(function(r){
    App.tcrInstance.methods.challenge(hash, amount).send(console.log)
    .on('error',function(error){alert("Failed")})
    });
  },

  vote: async function () {
    let hash = $('#VoteHash').val();
    let amount = $('#VoteAmount').val();
    let choice = $('#Vote').val();
    App.tokenInstance.methods.approve(App.tcrInstance.options.address, 10000)
    .send(function(r){
    App.tcrInstance.methods.vote(hash, amount, choice).send(console.log)
    .on('error',function(error){alert("Failed")})
    });
  },

  // Claim has to done by you. This is not correct
  Claim: async function () {
    let hash = $('#ClaimHash').val();
    let id = $('#ChallengeID').val();
    App.tcrInstance.methods.updateStatus(hash).send(function(r){
    App.tcrInstance.methods.claimRewards(id).send()
    .on('error',function(error){alert("Failed")})} )
    .on('error',function(error){alert("Failed")});
  },

  listenForEvents: async function() {
    var latestBlock;
    App.web3.eth.getBlockNumber()
    .then(function(b){
      latestBlock = b;
    });
    // web3.eth.getBlock("latest").then(console.log); //get the latest blocknumber
    // latestBlock = latestBlock.number;
    // console.log("Latest - ",latestBlock);
    App.tcrInstance.events._Application({fromBlock: 'latest'}, (error, event) => { 
      if (error) {
        console.log(error); return; 
      } else {
        if(event.blockNumber != latestBlock) {   //accept only new events
          // alert("I am app");
          latestBlock = latestBlock + 1;   //update the latest blockNumber
          App.render();
        }
      }
    });

    App.tcrInstance.events._Challenge({fromBlock: 'latest'}, (error, event) => { 
      if (error) {
        console.log(error); return; 
      } else {
        if(event.blockNumber != latestBlock) {   //accept only new events
          // alert("I am app");
          let lHash = event.returnValues[0];
          let cId = event.returnValues[1];
          App.challenges[lHash] = cId;
          latestBlock = latestBlock + 1;   //update the latest blockNumber
          App.render();
        }
      }
    });

    App.tcrInstance.events._Vote({fromBlock: 'latest'}, (error, event) => { 
      if (error) {
        console.log(error); return; 
      } else {
        if(event.blockNumber != latestBlock) {   //accept only new events
          let lHash = event.returnValues[0];
          let cId = event.returnValues[1];
          alert("Voted ", cId, lHash);
          latestBlock = latestBlock + 1;   //update the latest blockNumber
        }
      }
    });

    App.tcrInstance.events._ResolveChallenge({fromBlock: 'latest'}, (error, event) => { 
      if (error) {
        console.log(error); return; 
      } else {
        if(event.blockNumber != latestBlock) {   //accept only new events
          let lHash = event.returnValues[0];
          if(App.challenges[lHash])
            delete App.challenges[lHash];
          alert("Resolve Challenge ", lHash);
          latestBlock = latestBlock + 1;   //update the latest blockNumber
          App.render();
        }
      }
    }); 
  },

  updateStatus: function(lHash){
    console.log("Updating Status");
    // let lHashList = [];
    // Object.keys(App.courses).forEach((key)=>{
    //   App.courses[key].data.forEach((item)=>{
    //     App.tcrInstance.methods.updateStatus(item['lHash']).send();
    //     // lHashList.push(item['lHash']);
    //   });
    // });
    console.log(typeof(lHash));
    console.log(lHash);
    
    // var $temp = lHash;
    App.tcrInstance.methods.updateStatus(lHash).send();
    App.render();
  }
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});