/*================================
	Globals
=================================*/
var id,
	socket,
	gameInfo = {};

/*================================
	Event listeners
=================================*/
$(document).ready(function(){
		
	id = getURLParameter('id');

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

	getGameInfo();

});

/*================================
	Socket functions
=================================*
socket.onopen = function( evt ) {
	//stuff
}

socket.onmessage = function( evt ) {
	var message = JSON.parse(evt);
	console.log(message);
}

socket.onclose = function( evt ) {
	//stuffthings
}

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
function makeGame(id, callback) {
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