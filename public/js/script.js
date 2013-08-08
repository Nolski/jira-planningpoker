/*================================
	Globals
=================================*/
var id,
	socket,
	gameInfo = {},
	currentStory = {},
	estimates = [],
	stories = [],
	flipped = false;

/*================================
	Event listeners
=================================*/
$(document).ready(function(){

	id = getURLParameter('id');
	gameinfo = getGameInfo();
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

	

	/*================================
		Pusher functions
	=================================*/
	var pusher = new Pusher('a8a337eb4d5e4c071c6a');
	var channel = pusher.subscribe('game_' + id);

	channel.bind('new_story', function ( data ) {
		console.log('new story', data);
		stories.push(data);
		$('#stories').empty();
		for (var i = 0; i < stories.length; i++) {
			story = stories[i];
			if(story.story_points == null) {
				story.story_points = 0;
			}
			var storyTitle = '<li>' + story.ticket_no + '&nbsp;&nbsp;:&nbsp;&nbsp;'
						   + story.story_points; + '</li>';
			$('#stories').append(storyTitle);
		};
	});

	channel.bind('updated_story', function ( data ) {
		if (data.flipped == false) {
			return;
		}
		
		$('#result-cards').empty();
		flipped = true;
		for (var i = 0; i < data.estimates.length; i++) {
			estimate = data.estimates[i];
			console.log("estimate");
			console.log(estimate);
			var resultCard = "<div id='" + i + "'class='result-card' data-original-title='" 
				+ estimate.user.fullname + "'><h1>" + estimate.vote + "</h1></div>";
			$('#result-cards').append(resultCard);
			var id = '#' + i;
			$(id).tooltip();
		}
		
	});

	channel.bind('current_story', function ( data ) {
		currentStory = data
		$('#title').empty();
		$('#description').empty();
		var title = data.ticket_no + " - " + data.summary,
			description = data.description.replace('\n', '<br />');
		
		description = description.replace('\t', '');
		description = description.replace('\r', '');

		$('#title').html(title);
		$('#description').html(description);

	});

	channel.bind('estimate', function ( data ) {
		$('#result-cards').empty();
		estimates.push( data );
		for (var i = 0; i < estimates.length; i++) {
			estimate = estimates[i];
			console.log("estimate");
			console.log(estimate);
			var resultCard = "<div id='" + i + "'class='result-card' data-original-title='" 
				+ estimate.user.fullname + "'></div>";
			$('#result-cards').append(resultCard);
			var id = '#' + i;
			$(id).tooltip();
		}
	});

});

/*================================
	Ajax functions
=================================*/
function sendVote( storyValue ) {
	console.log('gameInfo before username: ', getGameInfo());
	var data = {
				vote: storyValue
			},
		ticket = currentStory.ticket_no,
		id = getId(),
		url = '/game/' + id + '/story/' + ticket + '/estimate';

	$.ajax({
		url: url,
		type: 'POST',
		dataType: 'JSON',
		'data': data,
		success: function( data, textStatus, jqXHR ) {
			console.log( 'success!' );
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log( 'ERROR: ', errorThrown );
		}
	});
}

function getGameInfo() {
	var id = getId(),
		url = '/game/' + id;
		
	$.ajax({
		url: url,
		type: 'GET',
		success: function( data, textStatus, jqXHR ) {
			gameInfo = JSON.parse( data );
			stories = gameInfo.stories;
			getCurrentStory();
			checkAdmin();
			console.log( 'sucessful! getGameInfo(): ', gameInfo );
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
			return null;
		}
	});
}

function getCurrentStory() {
	if(gameInfo.current_story == null) {
		getStories();
		return;
	}

	var url = '/game/' + getId() + '/story/' + gameInfo.current_story;

	$.ajax({
		url: url,
		type: 'GET',
		success: function( data, textStatus, jqXHR ) {
			console.log(data);
			currentStory = data;
			estimates = currentStory.estimates;
			console.log('getCurrentStory: ', currentStory);
			getStories();
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
			return null;
		}
	});
}

function getStories() {
	var url = '/game/' + getId() + '/story';

	$.ajax({
		url: url,
		type: 'GET',
		success: function( data, textStatus, jqXHR ) {
			stories = JSON.parse( data );
			console.log('getstories currentstory', currentStory);
			update();
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
function checkAdmin() {
	var url = '/login';

	$.ajax({
		url: url,
		type: 'GET',
		success: function( data, textStatus, jqXHR ) {
			if (data.username == gameInfo.moderator.username) {
				$('#admin-panel').show();
			}
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
			console.log('makeGame()', gameInfo);
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
	console.log(ticketNum);
	$.ajax({
		url: url,
		type: 'POST',
		data: data,
		success: function( data, textStatus, jqXHR ) {
			gameInfo = JSON.parse( data );
			console.log('makeGame()', gameInfo);
			getGameInfo();
			return gameInfo;
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
			window.location = '/join.html';
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
		}
	});
}

function setScore() {
	flipped = false;
	console.log(gameInfo);
	var url = '/game/' + getId() + '/story/' + gameInfo.current_story,
		sp = $('#score').val(),
		data = {
				flipped: true,
				story_points: sp
			};
	console.log(data);

	$.ajax({
		url: url,
		type: 'PUT',
		data: data,
		success: function( data, textStatus, jqXHR ) {
			console.log('setScore: ', data);
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
		}
	});
}

function flipCards() {
	flipped = true;
	var url = '/game/' + getId() + '/story/' + gameInfo.current_story,
		sp = $('#score').val(),
		data = {
				flipped: true,
			};

	$.ajax({
		url: url,
		type: 'PUT',
		data: data,
		success: function( data, textStatus, jqXHR ) {
			console.log('setScore: ', data);
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
		}
	});
}

/*================================
	Utility functions
=================================*/
function update() {
	console.log('update');
	console.log(stories);
	if (stories.length == 0) {
		return;
	}
	$('#stories').empty();
	for (var i = 0; i < stories.length; i++) {
		story = stories[i];
		console.log(story)
		if(story.story_points == null) {
			story.story_points = 0;
		}

		var storyTitle = '<li>' + story.ticket_no + '&nbsp;&nbsp;:&nbsp;&nbsp;'
					   + story.story_points; + '</li>';
		$('#stories').append(storyTitle);
	}

	$('#title').empty();
	$('#description').empty();
	var title = currentStory.ticket_no + " - " + currentStory.summary,
		description = "";
	console.log('currentStory - update', currentStory);
	if (currentStory.description != null) {
		description = currentStory.description.replace('\n', '<br />');
		description = description.replace('\t', '');
		description = description.replace('\r', '');
	}

	$('#title').html(title);
	$('#description').html(description);
	$('#ticket').val("");
	$('#score').val("");
	$('#game').val("");
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