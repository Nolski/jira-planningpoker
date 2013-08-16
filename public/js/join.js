var isAdmin = true;

$(document).ready(function() {
	//getGames();
	$('#new-btn').click(makeGame);
	$('.glyphicon-remove').click(removeGame);
	$('#save-url').click(changeUrl);
	$('#clear-games').click(clearGames);
	//checkAdmin(loadAdminTools);
});

function makeGame( id, callback ) {
	var url = '/game',
		name = $('#new').val(),
		data = {
			name: name
		};

	$.ajax({
		url: url,
		type: 'POST',
		data: data,
		success: function( data, textStatus, jqXHR ) {
			var gameInfo = data;
			window.location = '/showgame?id=' + gameInfo.id;
			return gameInfo;
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
			return null;
		}
	});
}

function removeGame() {
	if ( confirm('Are you sure you want to end this game?') ) {
		var url = '/game/' + $(this).attr('id');
		
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
}

function changeUrl() {
	var url = {
		"url": $('#url').val()
	};

	console.log(url);

	$.ajax({
		url: '/change-server',
		type: 'GET',
		data: url,
		success: function( data, textStatus, jqXHR ) {
			console.log("success: ", data);
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
		}
	});
}

function clearGames() {
	$.ajax({
		url: '/clear-closed',
		type: 'POST',
		success: function( data, textStatus, jqXHR ) {
			console.log("success: ", data);
		},
		error: function( jqXHR, textStatus, errorThrown ) {
			console.log('ERROR: ', errorThrown);
		}
	});
}