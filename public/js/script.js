/*================================
	Globals
=================================*/
var id,
	socket,
	gameInfo = {};
	stories = [];

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

	channel.bind('update_story', function ( data ) {
		$('#stories').empty();
		for (var i = 0; i < stories.length; i++) {
			story = stories[i];
			if (story.ticket_no == data.ticket_no) {
				story = data;
			}

			if(story.story_points == null) {
				story.story_points = 0;
			}
			var storyTitle = '<li>' + story.ticket_no + '&nbsp;&nbsp;:&nbsp;&nbsp;'
						   + story.story_points; + '</li>';
			$('#stories').append(storyTitle);
		};
	});

	channel.bind('current_story', function ( data ) {
		$('#title').empty();
		$('#description').empty();
		var title = data.ticket_no + " - " + data.summary,
			description = data.description.replace('\n', '<br />');
		
		description = description.replace('\t', '');
		description = description.replace('\r', '');

		$('#title').html(title);
		$('#description').html(description);

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
		ticket = 'TVTA-1234'
		id = getId(),
		url = '/game/' + id + '/story/' + ticket + '/estimate';

	$.ajax({
		url: url,
		type: 'POST',
		dataType: 'json',
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
			gameInfo = data;
			console.log( 'sucessful! getGameInfo(): ', gameInfo );
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
function makeGame( id, callback ) {
	var url = '/game',
		username = getUsername(),
		data = {
			name: 'username'
		};

	//data = JSON.stringify( data );
	$.ajax({
		url: url,
		type: 'POST',
		data: data,
		success: function( data, textStatus, jqXHR ) {
			gameInfo = data;
			console.log('makeGame()', gameInfo);
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
			gameInfo = data;
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


/*================================
	Polling functions
=================================*
function poll() {
	var url = '/game/' + getId() + '/story/' + gameInfo.current_story;
	$.ajax({
		url: url,
		type: 'GET',
		data: data,
		success: function( data, textStatus, jqXHR ) {
			updatePage( data );
			setTimeout(poll(), 5000);
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
		}
	});
}

function updatePage( data ) {
	var storyTitle = '<li>' + data.ticket_no + '&nbsp;&nbsp;:&nbsp;&nbsp;'
				+ data.story_points; + '</li>';
	$('#stories').append(storyTitle);

	
}

/*================================
	Utility functions
=================================*/
function getUsername() {
	return getURLParameter('username');
}

function getId() {
	return getURLParameter('id');
}

function getURLParameter( name ) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}