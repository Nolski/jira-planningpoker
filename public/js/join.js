$(document).ready(function() {
	getGames();
	$('.games-button').click( joinGame );
});

function getGames() {
	$.ajax({
		url: '/game',
		method: 'GET',
		success: function(data, textStatus, jqXHR) {
			update( data );
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log('ERROR: ', errorThrown);
		}
	});	
}

function update( data ) {
	$('#games-body').empty();
	for (var i = 0; i < data.length; i++) {
		var game = data[i],
			html = "<tr><td class='game'>" + game.name
			+ "</td><td class='games-button'><input type='button' "
			+ "class='btn btn-default' value='Join Game' id='" 
			+ i + "' /></td></tr>"
		$('#games-body').append( html );
	};
}

function joinGame() {
	var self = $(this),
		url = '/game/' + self.attr('id') + '/participants'
	$.ajax({
		url: '/game',
		method: 'POST',
		success: function(data, textStatus, jqXHR) {
			var gameUrl = '/index.html?id=' + self.attr('id');
			window.location(gameUrl);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log('ERROR: ', errorThrown);
		}
	});	
}