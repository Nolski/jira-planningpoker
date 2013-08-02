/*================================
	Globals
=================================*/
var id;
var socket;

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

	console.log( 'getGameInfo(): ', getGameInfo() );
	//socket = new WebSocket('ws://localhost:9393');
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
	var gameInfo = getGameInfo(),
		username = gameInfo.username,
		data = {
				value: storyValue,
				username: username
			},
		id = getId(),
		url = '/game/' + id + '/story/' + ticket + 'estimate';

	$.ajax({
		url: url,
		method: 'POST',
		data: data,
		dataType: 'json',
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
		url = '/game/' + id,
		result = {};

	$.ajax({
		url: url,
		method: 'GET',
		dataType: 'json',
		success: function( data, textStatus, jqXHR ) {
			result = JSON.parse(data);
			return result;
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