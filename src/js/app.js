// import Web3 from  '../../node_modules/web3/src/index.js';
// let TruffleContract = require('truffle-contract');


let oneReviewDiv = function({roll, review, rating, lHash, wl}){
  let icon;
  let reload;
  if (wl){
    icon = `<i title=\"Whitelisted\" class=\"material-icons\ green-text\">verified_user</i>`;
    reload = ``;
  } else if(App.challenges[lHash]){ // challenge going on
    let cId = App.challenges[lHash];
    icon = `<i data-tooltip=\"Copy Challenge Id\" class=\"material-icons red-text tooltipped \" onClick=\"App.copy_content(\'${cId}\')\">thumbs_up_down</i>`;
    reload = `<div class="col s1" onClick=\"App.updateStatus(\'${lHash}\')\"><i class="material-icons black-text">refresh</i></div>`;
  } else{
    icon = "<i title=\"Under Review\" class=\"material-icons\ yellow-text\">watch_later</i>"
    reload = `<div class="col s1" onClick=\"App.updateStatus(\'${lHash}\')\"><i class="material-icons black-text">refresh</i></div>`;
  }

  return(
    `<div class="row">`
    +  reload
    +  `<div class="col s5">${review}</div>
        <div class="col s2">${rating} <i class="material-icons tiny orange-text">star</i> </div>
        <div class="col s1">${icon}</div>
        <div class="col s3 tooltipped truncate copy_content"  data-tooltip="Click to Copy">
        ${lHash}</div>
        <div class="col s1 tooltipped" data-tooltip="Copy to Clipboard"><a class="btn" onClick="App.copy_content(\'${lHash}\')"><i class="material-icons">content_copy</i><p class="copy_content hide">${lHash}</p></a></div>
        
    </div>`
  );
}

let getCHeader = function(a,b,c){
  return (
    `<strong><div class="collapsible-header row collection">
                        <div class="col s4">${a}</div>
                        <div class="col s4">${b}<i class="material-icons orange-text">star</i></div>
                        <div class="col s4">${c}</div>
                      </div></strong>`
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
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
      web3 = new Web3(App.web3Provider);
    }
    App.web3 = web3;
    return App.initContract();
  },

  initContract: function () {
    $.getJSON("Tcr.json", function (tcr) {
      // Instantiate a new truffle contract from the artifact
      let abi = tcr.abi;
      console.log(App.web3);
      App.tcrInstance = new App.web3.eth.Contract(abi, "0x1Cc861bb43f53ED6Ad68D5040F63e7Dc683d691A");
      // Connect provider to interact with contract
      App.tcrInstance.setProvider(App.web3Provider);
      App.listenForEvents();


    }).then(function () {
      $.getJSON("Token.json", function (token) {
        let abi = token.abi;
        App.tokenInstance = new App.web3.eth.Contract(abi, "0x239Ed6f19F5543CA5be789A1241D569B3bA836DE");
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

      return App.readHistory();
      // return App.render();
    });
  },

  readHistory: function(){
    App.tcrInstance.getPastEvents('_Challenge',{fromBlock: 0,
      toBlock: 'latest'}, function(er,ev){
        ev.forEach(function(event){
          console.log("History:Challenge Event", event);
          let lHash = event.returnValues[0];
          let cId = event.returnValues[1];
          App.challenges[lHash] = cId;
        }); 
      // use App.challenged to Display that the listing is under a poll 
    });
    
    App.tcrInstance.getPastEvents('_ResolveChallenge',{fromBlock: 0,
      toBlock: 'latest'}, function(er,ev){
        ev.forEach(function(event){
          console.log("History:ResolveChallenge Event", event);
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
    console.log("Rendering");

    var loader = $("#loader");
    var content = $("#content");

    loader.show();
    content.hide();

    // Load contract data
    let courses = {};
    // let listings = []];
    console.log("About to get all listings");
    App.tcrInstance.methods.getAllListings().call(function (error, l) {
      console.log("all listings got");
      if(error){
        console.log("ERROR in get all listing");
        console.error(error);
        return;
      }
      if(l==null){
        loader.hide();
        content.show();
        return;
      }
      for (let i = 0; i < l[0].length; i++) {
        let item = {};
        let rev = l[0][i].split('|');
        if(rev[1] === "")
          continue;
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
        console.log("handle listing",i);
      }
      console.log(courses);
      App.courses = courses;
      var reviewList = $(".courseReviewList");
      reviewList.empty();
      // console.log(minDeposit[0]);
      Object.keys(courses).forEach(function(key) {
        let cHeader = getCHeader(key, courses[key].avgRating, courses[key].numRatings);
        let reviewDivs = [];
        courses[key].data.forEach(function(item){
            reviewDivs.push(oneReviewDiv(item))
        });
        let cBody = [];
        reviewDivs.forEach(function(rd){
          cBody.push("<div class=\"collapsible-body\">" + rd +"</div>");
        });
        cBody = cBody.join(' ');
        // let cBody = "<div class=\"collapsible-body\">" + reviewDivs.join(' ')+"</div>";
        reviewList.append(`<li>${cHeader}${cBody}</li>`);
      });
      loader.hide();
      content.show();
      
      $(document).ready(function(){
        $('.collapsible').collapsible();
        $('.tooltipped').tooltip();
        $('.copy_content').click(function(e){
          let $temp = $("<input>");
          $temp.val(e.target.innerText);
          // var $temp = e.target;
          // $("body").append($temp);
          console.log($temp[0]);
          document.body.appendChild($temp[0]);
          $temp[0].select();
          document.execCommand("copy");
          document.body.removeChild($temp[0]);
        });
      });

    });
    console.log("exiting render");
  },

  copy_content: function(text){
    let $temp = $("<input>");
    $temp.val(text);
    // var $temp = e.target;
    // $("body").append($temp);
    console.log($temp[0]);
    document.body.appendChild($temp[0]);
    $temp[0].select();
    document.execCommand("copy");
    document.body.removeChild($temp[0]);
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

    App.tokenInstance.methods.approve(App.tcrInstance.options.address, amount)
    .send(function(r){
    App.tcrInstance.methods.propose(amount, roll, course_code, review, rating).send(console.log)
    .on('error',function(error){alert("Failed")})
    });  
    document.getElementById("proposeForm").reset();
  },

  challenge: async function () {
    let hash = $('#hash').val();
    let amount = $('#challenge_amount').val();
    App.tokenInstance.methods.approve(App.tcrInstance.options.address, amount)
    .send(function(r){
    App.tcrInstance.methods.challenge(hash, amount).send(console.log)
    .on('error',function(error){alert("Failed")})
    });
    document.getElementById("challengeForm").reset();
  },

  vote: async function () {
    let hash = $('#VoteHash').val();
    let amount = $('#VoteAmount').val();
    let vote = $('#Vote').val();
    let choice = false;
    if (vote != 0)
        choice = true;
    App.tokenInstance.methods.approve(App.tcrInstance.options.address, amount)
    .send(function(r){
    App.tcrInstance.methods.vote(hash, amount, choice).send(console.log)
    .on('error',function(error){alert("Failed")})
    });
    document.getElementById("voteForm").reset();
  },


  Claim: async function () {
    //let hash = $('#ClaimHash').val();
    let flag = 0;
    let id = $('#ChallengeID').val();
    Object.keys(App.challenges).forEach(function(key) {
      
      if (App.challenges[key] = id) {
        console.log('Key : ' + key + ', Value : ' + App.challenges[key]);
        //var hash = App.web3.utils.fromAscii(key);
        let $temp = key; 
        var hash = $temp//.val() 
        console.log(hash)     
        //var hash = bytes32(parseInt(key, 32));
        App.tcrInstance.methods.updateStatus(hash).send(function(r){
        App.tcrInstance.methods.claimRewards(id).send()
        .on('error',function(error){alert("Failed")})} )
        .on('error',function(error){alert("Failed")});
        flag = 1;
      /* App.tcrInstance.methods.updateStatus(hash).send
        .on('error',function(error){alert("Failed")});*/
      }
    });
    //let hash = App.challenges[lHash]
    if (flag == 0)
     { App.tcrInstance.methods.claimRewards(id).send()
      .on('error',function(error){alert("Failed")})
     }
     document.getElementById("claimForm").reset();
  },

  listenForEvents:  function() {
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

    window.ethereum.on('accountsChanged', function (accounts) {
      // Time to reload your interface with accounts[0]!
      App.account = accounts[0];
      console.log(App.account)
      App.tcrInstance.options.from = App.account;
      App.tokenInstance.options.from = App.account;
    })
    
  },

  updateStatus: function(lHash){
    console.log("Updating Status of ", lHash);
    App.tcrInstance.methods.updateStatus(lHash).send(function(r){App.render();});
  }
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});