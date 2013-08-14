/*================================
	Globals
=================================*/
var id,
	socket,
	gameInfo = {},
	isAdmin,
	currentStoryNo = null,
	stories = {}, //hash of ticket_no => story (new API)
	pusher_prod = 'a8a337eb4d5e4c071c6a',
	pusher_dev = '32de1f05aeb0cce00299', //will be active on localhost
	pusher_key = (document.domain == 'localhost') ? pusher_dev : pusher_prod,
	timerStarted = false,
	interval;

/*================================
	Event listeners
=================================*/
$(document).ready(function(){

	id = getURLParameter('id');
	updateGameInfo(function() {
		checkAdmin(function(){
			updateStories(function() {
				joinGame()
			});
		});
	});
	$('.card').hover(function() {
		$(this).animate({
			'top': '5px'
		}, 75);
	}, function() {
		$(this).animate({
			'top': '0px'
		}, 75);
	});

	$('.result-card').hover(function() {
		var id = $(this).attr("id");
		$(this).tooltip();
	});

	$('.card').click(function() {
		var storyValue = parseInt( $(this).attr('value') );
		sendVote( storyValue );
	});

	$('#ticket').keyup(function(data){
		$(this).val($(this).val().toUpperCase().replace(/[^A-Z0-9\-,]/g, ''));
		//this could be better, just hacked this out b/c I didn't want to use capslock
	});

	$('#new-ticket-btn').click(makeStory);
	$('#new-game-btn').click(makeGame);
	$('#set-score-btn').click(setScore);
	$('#flip-btn').click(flipCards);
	$('#end-game-btn').click(endGame);
	$('#clear-btn').click(deleteEstimates);
	$('#start-timer').click(startTimer);

	/*================================
		Pusher functions
	=================================*/
	var pusher = new Pusher(pusher_key),
		channel = pusher.subscribe('game_' + id);

	channel.bind('new_story', function ( data ) {
		stories[data.ticket_no] = data;
		appendStory(data);
	});

	channel.bind('updated_story', function ( data ) {
		stories[data.ticket_no] = data;
		refreshAll();
		
	});

	channel.bind('current_story', function ( data ) {
		currentStoryNo = data.ticket_no
		stories[data.ticket_no] = data;
		refreshAll();

	});

	channel.bind('estimate', function ( data ) {
		stories[data.ticket_no].estimates.push(data);
		appendEstimate(data);
	});

	channel.bind('closed', function ( data ) {
		if (!isAdmin)
			alert("The moderator ended this game.");
		window.location = '/gamesList';
	});
	channel.bind('joined', appendParticipant);
	channel.bind('new_round', function ( data ){
		stories[data.ticket_no].estimates = [];
		stories[data.ticket_no].flipped = false;
		refreshAll();
	});
	channel.bind('deleted_story', function ( data ){
		ticket_no = data;
		console.log("got delete event with data", data);
		delete stories[ticket_no];
		if (currentStoryNo == ticket_no)
			currentStoryNo = null;
		$('#list-'+ticket_no).slideUp({complete: function(){
			this.remove();
		}});
		//refreshAll();
	});
});

/*================================
	Ajax functions
=================================*/
function sendVote( storyValue ) {
	if (stories[currentStoryNo].flipped) {
		return;
	}
	var data = {
				vote: storyValue
			},
		ticket = currentStoryNo,
		id = getId(),
		url = '/game/' + id + '/story/' + ticket + '/estimate';

	$.ajax({
		url: url,
		type: 'POST',
		dataType: 'JSON',
		'data': data,
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log( 'ERROR: ', errorThrown );
		}
	});
}

function updateGameInfo(callback) {
	var id = getId(),
		url = '/game/' + id;
		
	$.ajax({
		url: url,
		type: 'GET',
		success: function( data, textStatus, jqXHR ) {
			gameInfo = JSON.parse( data );
			currentStoryNo = gameInfo['current_story'];
			if (callback != undefined) {
				callback();
			}
			return gameInfo;
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
			return null;
		}
	});
}

function updateStories(callback) {
	var url = '/game/' + getId() + '/story';

	$.ajax({
		url: url,
		type: 'GET',
		success: function( data, textStatus, jqXHR ) {
			stories = JSON.parse( data );
			if (callback != undefined) {
				callback()
			}
			refreshAll();
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
			return null;
		}
	});
}

/*================================
	Admin Ajax functions
=================================*/
function deleteEstimates() {
	var url = '/game/' + getId() + '/story/' + currentStoryNo + '/estimate';

	$.ajax({
		url: url,
		type: 'DELETE',
		success: function( data, textStatus, jqXHR ) {
			stories[currentStoryNo].estimates = data;
			stories[currentStoryNo].flipped = false;
			$('#flip-btn').removeClass('disabled');
			refreshDisplayedStory();
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
			return null;
		}
	});
}

function checkAdmin(callback) {
	var url = '/login';

	$.ajax({
		url: url,
		type: 'GET',
		success: function( data, textStatus, jqXHR ) {
			isAdmin = data.username == gameInfo.moderator.username;
			$('#admin-panel').toggle(isAdmin)
			$('.side-tickets li').toggleClass('clickable', isAdmin);
			if (callback!=undefined)
				callback();
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
			return null;
		}
	});
}

function makeGame( id, callback ) {
	var url = '/game',
		name = $('#game').val(),
		data = {
			name: name
		};

	$.ajax({
		url: url,
		type: 'POST',
		data: data,
		success: function( data, textStatus, jqXHR ) {
			gameInfo = JSON.parse( data );
			window.location = '/index.html?id=' + gameInfo.id;
			return gameInfo;
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
			return null;
		}
	});
}

function makeStory() {
	var url = '/game/' + getId() + '/story',
		ticketNum = $('#ticket').val(),
		data = { 'ticket_no': ticketNum };
	$.ajax({
		url: url,
		type: 'POST',
		data: data,
		dataType: 'JSON',
		success: function( data, textStatus, jqXHR ) {
			stories[data.ticket_no] = data;
			if (currentStoryNo == null){
				currentStoryNo = data.ticket_no;
				refreshAll();
			}
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
			return null;
		}
	});
}

function endGame() {
	var url = '/game/' + getId();
	$.ajax({
		url: url,
		type: 'DELETE',
		success: function( data, textStatus, jqXHR ) {
			window.location = '/gamesList';
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
		}
	});
}

function setScore() {
	var url = '/game/' + getId() + '/story/' + currentStoryNo,
		sp = $('#score').val(),
		data = {
				story_points: sp
			};

	$.ajax({
		url: url,
		type: 'PUT',
		data: data,
		success: function( data, textStatus, jqXHR ) {
			stories[data.ticket_no] = data;//save updated story
			refreshAll();
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
		}
	});
}

function flipCards() {
	var url = '/game/' + getId() + '/story/' + currentStoryNo,
		data = {
				flipped: true,
			};
	$.ajax({
		url: url,
		type: 'PUT',
		data: data,
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
		}
	});
}

function storyClickHandler(clickEvent){
	if (!isAdmin)
		return;//non admin cannot go to story
	var story = clickEvent.data;
	var url = '/game/'+getId() + '/goto-story/'+story.ticket_no;
	$.ajax({
		url: url,
		type: 'POST',

	});
}
function storyDeleteHandler(clickEvent){
	if (!isAdmin)
		return;//non admin cannot delete
	var story = clickEvent.data;
	var url = '/game/'+getId() + '/story/'+story.ticket_no;
	$.ajax({
		url: url,
		type: 'DELETE',

	});
}
function joinGame(callback) {
	var self = $(this),
		url = '/game/' + getId() + '/participants'
	$.ajax({
		url: url,
		method: 'POST',
		success: function() {
			if (callback != undefined) {
				callback();
			}
		}
	});	
}

/*================================
	Utility functions
=================================*/
function refreshAll() {
	refreshStoryList();
	refreshDisplayedStory(refreshParticipants);

	var storyLoaded = currentStoryNo != null;
	//hide things you can't do w/o a story
	$('#my-cards,#header').toggle(storyLoaded);
	$('#set-score-form .btn').toggleClass('disabled', !storyLoaded);
	$('#flip-btn').toggleClass('disabled', !(storyLoaded && !stories[currentStoryNo].flipped));

	$('#ticket').val("");
	$('#score').val("");
	$('#game').val("");
	document.title = "Game - "+ gameInfo.name;
}
var lastStory;
function refreshDisplayedStory(callback){
	//Generate ticket info
	$('#title').empty();
	$('#description').empty();
	var storyLoaded = currentStoryNo != undefined && currentStoryNo != null;
	
	var title,
		description;
	
	if (storyLoaded) {
		title = '<a href="https://request.siteworx.com/browse/' + stories[currentStoryNo].ticket_no 
			    + '" target="_blank">';
		title += stories[currentStoryNo].ticket_no;
		if (stories[currentStoryNo].summary!= null)
			title+= " - " + stories[currentStoryNo].summary;
		description = "";
		title += "</a>";
		if (stories[currentStoryNo].description != null) { //always was true anyways
			description = stories[currentStoryNo].description.split('\n').join('<br />');
			description = description.split('\t').join('');
			description = description.split('\r').join('');
		}
	} else {
		description = '';
		title = 'No story loaded';
	}
	$('#title').html(title);
	$('#description').html(description);

	if (lastStory != currentStoryNo || (storyLoaded && stories[currentStoryNo].estimates.length == 0))
		$('#result-cards').empty();
	if (storyLoaded){
		if (stories[currentStoryNo].flipped)
			$('#my-cards').slideUp();
		else
			$('#my-cards').slideDown();
	}
	refreshEstimates();
	lastStory = currentStoryNo;
	if (callback != undefined) {
		callback();
	}

}
function refreshEstimates(){
	if (currentStoryNo == null)
		return;
	for (var i = 0; i < stories[currentStoryNo].estimates.length; i++) {
		estimate = stories[currentStoryNo].estimates[i];
		appendEstimate(estimate);
	}
}
//show new estimate OR update vote on existing one
function appendEstimate(estimate){
	var id = "card-"+estimate.user.username,
		card = document.getElementById(id);

	if (card == undefined){
		card = document.createElement('div');
		card.id = id;
		var nameOnCard = document.createElement('span')
		nameOnCard.appendChild(document.createTextNode(estimate.user.fullname));
		nameOnCard.style.display = 'none';
		card.appendChild(nameOnCard);
		var vote = document.createElement('h1');
		vote.className = 'vote';
		card.appendChild(vote);
		card.className = 'result-card';
		card.setAttribute('data-original-title', estimate.user.fullname);
		if (estimate.vote != undefined){
			$(vote).empty().text(estimate.vote);
		}
		$(card).hide().appendTo('#result-cards').slideDown();
	} else { //update existing card
		var $vote = $('#'+id+' .vote');
		if ($vote.length && estimate.vote != undefined){
			$vote.empty().text(estimate.vote);
			$vote.fadeIn();
		} else {
			$vote.hide();
		}
	}
	$(card).tooltip();
}
//Generate stories on side bar
function refreshStoryList(){
	//$('#stories').empty();
	$('.side-tickets > li.active').removeClass('active');
	$.each(stories, function (ticket_no, story){
		appendStory(story);
	});

}
//append a story to the sidebar OR update one that's already there
function appendStory(story){
	var id = 'list-'+story.ticket_no;
	var li = document.getElementById(id);
	var $spSpan; //will be the jquery element for the story point span, created now or fetched
	if (li == undefined){
		//contain the text we click 
		var textDiv = document.createElement('div');
		textDiv.className = "ticket-text";

		var noText = document.createTextNode(story.ticket_no);
		var noSpan = document.createElement('span');
		noSpan.appendChild(noText);
		noSpan.className = "ticket-no";
		
		var spText = document.createTextNode(story.story_points);
		var spSpan = document.createElement('span');
		spSpan.className = "story-points";
		spSpan.appendChild(spText);
		
		var sepSpan = document.createElement('span');
		sepSpan.className = 'separator';
		sepSpan.innerHTML = "&nbsp;&nbsp;:&nbsp;&nbsp;";
		$(sepSpan).toggle(story.story_points >= 0);

		var li = document.createElement('li');
		li.id = id;
		textDiv.appendChild(noSpan);
		textDiv.appendChild(sepSpan);
		textDiv.appendChild(spSpan);

		$(textDiv).click(story, storyClickHandler);
		$(li).toggleClass('clickable', isAdmin);
		//that's it for the text

		var closeBtn = document.createElement('div');
		closeBtn.appendChild(document.createTextNode('X'));
		closeBtn.className = "close-btn";
		$(closeBtn).click(story, storyDeleteHandler);
		if (isAdmin)
			li.appendChild(closeBtn);
		li.appendChild(textDiv);

		$spSpan = $(spSpan);

		$('#stories').append(li);
		$(li).hide().slideDown();
	} else {
		$spSpan = $('#'+id+" .story-points");
		$spSpan.text(story.story_points);
		$('#'+id+' .separator').toggle(story.story_points >= 0);
	}

	$spSpan.toggle(story.story_points >= 0);

	$(li).toggleClass('active', story.ticket_no == currentStoryNo);

}
function refreshParticipants(){
	for (var i=0;i<gameInfo.participants.length;i++)
		appendParticipant(gameInfo.participants[i]);
}
function appendParticipant(user){
	var id = 'participant-'+user.username;
	var li = document.getElementById(id);
	if (li==undefined){
		li = document.createElement('li');
		li.id=id;
		li.appendChild(document.createTextNode(user.fullname));
		$('#participants').append(li);
		$(li).hide().slideDown();
	}
}
function startTimer() {
	var minHtml = "";
		secHtml = "";
	if(timerStarted) {
		clearInterval(interval);
		$('#minutes').empty();
		$('#seconds').empty();
		$('#start-timer').empty();
		minHtml = "00<sup>M</sup>";
		secHtml = "00<sup>S</sup>";
		$('#minutes').html(minHtml);
		$('#seconds').html(secHtml);
		$('#start-timer').html("START");
		return;
	} else {
		var start = new Date().getTime();
		$('#start-timer').empty();
		$('#start-timer').html("stop");

		interval = window.setInterval(function incrementTime() {
			$('#minutes').empty();
			$('#seconds').empty();
			
			var time = new Date().getTime() - start,
				timeInSeconds = Math.floor(time / 1000),
				minutes = Math.floor(timeInSeconds / 60),
				seconds = timeInSeconds % 60;
			
			if (minutes < 10) {
				minHtml += "0";
			}
			if(seconds < 10) {
				secHtml += "0";
			}

			minHtml += minutes + "<sup>M</sup>";
			secHtml += seconds + "<sup>S</sup>";

			$('#minutes').html(minHtml);
			$('#seconds').html(secHtml);

			minHtml = "";
			secHtml = "";
		}, 100);		
	}
}
function getUsername() {
	return getURLParameter('username');
}

function getId() {
	return getURLParameter('id');
}

function getURLParameter( name ) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}
