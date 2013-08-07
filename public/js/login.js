function login() {
	var username = document.getElementById('username').value,
		password = document.getElementById('password').value,
		data = { username: username, password: password};

	$.ajax({
		url: '/login',
		method: 'POST',
		data: data,
		dataType: 'json',
		success: function(data, textStatus, jqXHR) {
			window.location = "/join.html";
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log('ERROR: ', errorThrown);
		}
	});
}
