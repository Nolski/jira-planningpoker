$(document).ready(function() {
	//getGames();
	$('#new-btn').click(function makeGame( id, callback ) {
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
	});
});

/*function getGames() {
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
}*/

/*function update( data ) {
	$('#games-body').empty();
	for (var i = 0; i < data.length; i++) {
		var game = data[i],
			html = "<tr><td class='game'>" + game.name
			+ "</td><td id='" + game.id + "' class='games-button'><input type='button' "
			+ "class='btn btn-default button-click' value='Join Game' /></td></tr>";
		$('#games-body').append( html );
	};
	$('.games-button').click(joinGame);
}*/

/*function joinGame() {
	var self = $(this),
		url = '/game/' + self.attr('id') + '/participants'
	$.ajax({
		url: url,
		method: 'POST',
		success: function(data, textStatus, jqXHR) {
			var gameUrl = '/index.html?id=' + self.attr('id');
			window.location = gameUrl;
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log('ERROR: ', errorThrown);
		}
	});	
}*/


