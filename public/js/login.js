function login() {
	var username = document.getElementById('username').value,
		data = { username: username };

	$.ajax({
		url: '/login',
		method: 'POST',
		data: data,
		dataType: 'json',
		success: function(data, textStatus, jqXHR) {
			console.log('success!');
			window.location = "/index.html?id=1";
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log('ERROR: ', errorThrown);
		}
	});
}