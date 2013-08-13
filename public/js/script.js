/*================================
	Globals
=================================*/
var id,
	socket,
	gameInfo = {},
	isAdmin;
	currentStoryNo = null,
	stories = {}, //hash of ticket_no => story (new API)
	pusher_prod = 'a8a337eb4d5e4c071c6a',
	pusher_dev = '32de1f05aeb0cce00299', //will be active on localhost
	pusher_key = (document.domain == 'localhost') ? pusher_dev : pusher_prod;

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
		$(this).val($(this).val().toUpperCase().replace(/[^A-Z0-9\-]/g, ''));
		//this could be better, just hacked this out b/c I didn't want to use capslock
	});

	$('#new-ticket-btn').click(makeStory);
	$('#new-game-btn').click(makeGame);
	$('#set-score-btn').click(setScore);
	$('#flip-btn').click(flipCards);
	$('#end-game-btn').click(endGame);
	$('#clear-btn').click(deleteEstimates);
	

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
		console.log('updated_story: ', data);
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
	if (!confirm('Are you sure you want to end this game?')) {
		return;
	}
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
	refreshDisplayedStory(function() {
		refreshParticipants(function() {
			refreshEstimates();
		});
	});

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
	var id = 'list-'+story.ticket_no,
		li = document.getElementById(id),
		$spSpan; //will be the jquery element for the story point span, created now or fetched

	if (li == undefined){
		var noText = document.createTextNode(story.ticket_no),
			noSpan = document.createElement('span');
		noSpan.appendChild(noText);
		noSpan.className = "ticket-no";
		
		var closeSpan = document.createElement('span');
		closeSpan.appendChild('X');
		closeSpan.id = 'close-' + story.ticket_no;
		closeSpan.className = 'close-story';

		var spText = document.createTextNode(story.story_points),
			spSpan = document.createElement('span');
		spSpan.className = "story-points";
		spSpan.appendChild(spText);
		
		var sepSpan = document.createElement('span');
		sepSpan.className = 'separator';
		sepSpan.innerHTML = "&nbsp;&nbsp;:&nbsp;&nbsp;";
		$(sepSpan).toggle(story.story_points >= 0);

		var li = document.createElement('li');
		li.id = "list-"+story.ticket_no;
		li.appendChild(closeSpan);
		li.appendChild(noSpan);
		li.appendChild(sepSpan);
		li.appendChild(spSpan);

		$spSpan = $(spSpan);

		$(li).click(story, storyClickHandler);
		$(li).toggleClass('clickable', isAdmin);
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
function refreshParticipants(callback){
	for (var i=0;i<gameInfo.participants.length;i++)
		appendParticipant(gameInfo.participants[i]);
	if(callback != undefined) {
		callback();
	}
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
function updateResultCards(){
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
