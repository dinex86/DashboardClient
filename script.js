var MAXRPM = 0;
var shiftindicator = 0.985;
var ws = null;

$(document).ready(function () {
	
	window.onclick = function() { switchScreen(); };
	
	createRpmBarMarkers();
	wakeUpServer();
	setInterval(function () { wakeUpServer(); }, 3000);
});

function switchScreen() {
	$('#first_screen').toggle();
	$('#second_screen').toggle();
	
	//if($('first_screen').css('display') == 'none');
}

function wakeUpServer() {
	if (ws == null || (ws != undefined && ws.readyState != ws.OPEN)) {
		startClient();
	}
}

function startClient() {
	var wsAddress = 'ws://localhost:8080/';
	console.info('connecting ' + wsAddress);
	ws = new WebSocket(wsAddress);
	var tmp = false;
	
	ws.onerror = function(message) {
		console.log('WebSocket Status: Error was reported');
	};
	
	ws.onopen = function() {
	 	console.log('Socket Opened');
	};

	// when the connection is closed, this method is called
	ws.onclose = function (evt) {
		console.log('Socket Closed');
	}
	
	ws.onmessage = function(message) {
		var json = JSON.parse(message.data);
	
		if (tmp == false) {
			tmp = true;
			console.info(json);
		}
		
		update(json);
	};
}

function update(json) {
	var gear = parseFloat(json.Gear);
	if (gear == 0) {
		gear = 'N';
	} else if (gear == -1) {
		gear = 'R';
	}
	
	if (json.CarSpeed == undefined) {
		console.info(json);
		return;
	}
	
	$(".speed").html(json.CarSpeed.toFixed(0));
	$(".gear").html(gear);
	
	// RPM stuff.	
	if (json.MaxEngineRpm > 0) {
		updateMaxRpm(json.MaxEngineRpm, true);
	} else {
		updateMaxRpm(json.EngineRpm, false);
	}
	var rpm_per = json.EngineRpm/MAXRPM;
	
	//$("#rpm").html(json.EngineRps.toFixed(0);
	$("#rpm_bar").width(convertRpmToPercent(rpm_per) + "%");
	
	$("#led1").attr('class', rpm_per >= 0.500 ? "green" : "");
	$("#led2").attr('class', rpm_per >= 0.575 ? "green" : "");
	$("#led3").attr('class', rpm_per >= 0.650 ? "green" : "");
	$("#led4").attr('class', rpm_per >= 0.725 ? "green" : "");
	
	$("#led5").attr('class', rpm_per >= 0.80 ? "yellow" : "");
	$("#led6").attr('class', rpm_per >= 0.83 ? "yellow" : "");
	$("#led7").attr('class', rpm_per >= 0.86 ? "yellow" : "");
	$("#led8").attr('class', rpm_per >= 0.89 ? "yellow" : "");
	
	$("#led9").attr('class',  rpm_per >= 0.91 ? "red" : "");
	$("#led10").attr('class', rpm_per >= 0.93 ? "red" : "");
	$("#led11").attr('class', rpm_per >= 0.95 ? "red" : "");
	$("#led12").attr('class', rpm_per >= 0.97 ? "red" : "");
	
	// Special styles.
	$("#leds").attr('class', rpm_per >= shiftindicator || json.PitLimiter ? "blink" : "");
	//$(".gear").attr('class', rpm_per >= shiftindicator ? "shift_indicator blink" : "");
	//$(".speed").attr('class', json.DrsEngaged ? "speed_drs_active blink" : "");
	
	// Fuel.
	$("#fuellaps").html(json.FuelLapsLeftEstimate > 0 ? (Math.floor(json.FuelLapsLeftEstimate * 10) / 10).toFixed(1) : "-");
	$("#fuel").html((Math.floor(json.FuelLeft * 10) / 10).toFixed(1));
	$("#avgfuel").html(json.FuelPerLap > 0 ? (Math.ceil(json.FuelPerLap * 10) / 10).toFixed(1) : "-");
	
	$("#lap").html((json.NumberOfLaps > 0 && json.CompletedLaps >= json.NumberOfLaps ? json.NumberOfLaps : json.CompletedLaps + 1) + (json.NumberOfLaps > 0 ? "/" + json.NumberOfLaps : ""));
	$("#pos").html(json.Position + "/" + json.NumCars);
	
	// DRS
	var drsText = '-';
	var drsStyle = '';
	if (json.DrsEquipped == 1) {
		if (json.DrsEngaged > 0) {
			drsText = 'ACTIVE';
		} else if (json.DrsNumActivationsLeft >= 0) {
			drsText = json.DrsNumActivationsLeft > 1000 ? '&infin;' : json.DrsNumActivationsLeft;
		} else {
			drsText = 'DRS';
		}
		
		if (json.DrsAvailable == 0) {
			// Style.
			drsStyle = 'drs_available';
		}
	}

	$("#drs").html(drsText);
	$("#drs").attr('class', drsStyle);
	
	//P2P
	var p2pText = '-';
	var p2pStyle = '';
	if (json.PushToPassEquipped == 1) {
		if (json.PushToPassEngaged > 0) {
			p2pText = json.PushToPassEngagedTimeLeft.toFixed(1);
			p2pStyle = 'p2p_engaged';
		} else if (json.PushToPassWaitTimeLeft > 0) {
			p2pText = json.PushToPassWaitTimeLeft.toFixed(0);
			p2pStyle = 'p2p_cooldown';
		} else if (json.PushToPassAvailable > 0) {
			p2pText = json.PushToPassNumActivationsLeft > 1000 ? '&infin;' : json.PushToPassNumActivationsLeft;
		} else {
			p2pText = 'P2P';
		}
	}

	$("#p2p").html(p2pText);
	$("#p2p").attr('class', p2pStyle);
	
	// Times.
	$("#laptime").html(formatLapTime(json.LapTimeCurrentSelf));
	$("#lastlap").html(formatLapTime(json.LapTimePreviousSelf));
	$("#bestlap").html(formatLapTime(json.LapTimeBestSelf));
	$("#sessiontime").html(formatTime(json.SessionTimeRemaining));
	$("#clock").html(moment().local().format("HH:mm:ss"));
	
	//Delta
	if (json.LapTimeCurrentSelf > 0 && json.LapTimeBestSelf > 0) {
		var delta = json.DeltaBestSelf;
		
		$("#delta").html((delta >= 0 ? '+' : '') + delta.toFixed(3));
		$("#delta").attr('class', delta >= 0 ? 'positive' : 'negative');
	} else {
		$("#delta").html('-');
		$("#delta").removeClass();
	}
	
	// Flags.
	var flagClass = '';
	if (json.CurrentFlag == 0) {
		flagClass = 'green';
	} else if (json.CurrentFlag == 1) {
		flagClass = 'yellow blink';
	} else if (json.CurrentFlag == 2) {
		flagClass = 'blue blink';
	} else if (json.CurrentFlag == 3) {
		flagClass = 'black';
	} else if (json.CurrentFlag == 4) {
		flagClass = 'black_white';
	} else if (json.CurrentFlag == 5) {
		flagClass = 'white blink';
	} else if (json.CurrentFlag == 6) {
		flagClass = 'checkered';
	} else if (json.CurrentFlag == 7) {
		flagClass = 'penalty blink';
	}
	
	var flag = $('#flag');
	if (!flag.hasClass(flagClass)) {
		flag.attr('class', flagClass);
	}
	
	// Tires.
	$('#tire_temp_front_left').html(json.TireTempFrontLeft > -1 ? Math.floor(json.TireTempFrontLeft) + '°C' : 'N/A');
	$('#tire_temp_front_right').html(json.TireTempFrontRight > -1 ? Math.floor(json.TireTempFrontRight) + '°C' : 'N/A');
	$('#tire_temp_rear_left').html(json.TireTempRearLeft > -1 ? Math.floor(json.TireTempRearLeft) + '°C' : 'N/A');
	$('#tire_temp_rear_right').html(json.TireTempRearRight > -1 ? Math.floor(json.TireTempRearRight) + '°C' : 'N/A');
	
	$('#tire_wear_front_left').html(json.TireWearFrontLeft > -1 ? Math.floor(json.TireWearFrontLeft * 100.0) + '%' : 'N/A');
	$('#tire_wear_front_right').html(json.TireWearFrontRight > -1 ? Math.floor(json.TireWearFrontRight * 100.0) + '%' : 'N/A');
	$('#tire_wear_rear_left').html(json.TireWearRearLeft > -1 ? Math.floor(json.TireWearRearLeft * 100.0) + '%' : 'N/A');
	$('#tire_wear_rear_right').html(json.TireWearRearRight > -1 ? Math.floor(json.TireWearRearRight * 100.0) + '%' : 'N/A');
	
	$('#tire_pressure_front_left').html(json.TirePressureFrontLeft > -1 ? Math.floor(json.TirePressureFrontLeft) + 'psi' : 'N/A');
	$('#tire_pressure_front_right').html(json.TirePressureFrontRight > -1 ? Math.floor(json.TirePressureFrontRight) + 'psi' : 'N/A');
	$('#tire_pressure_rear_left').html(json.TirePressureRearLeft > -1 ? Math.floor(json.TirePressureRearLeft) + 'psi' : 'N/A');
	$('#tire_pressure_rear_right').html(json.TirePressureRearRight > -1 ? Math.floor(json.TirePressureRearRight) + 'psi' : 'N/A');
	
	updateTireWear('tire_front_left', json.TireWearFrontLeft);
	updateTireWear('tire_front_right', json.TireWearFrontRight);
	updateTireWear('tire_rear_left', json.TireWearRearLeft);
	updateTireWear('tire_rear_right', json.TireWearRearRight);
}

function updateTireWear(id, value) {
	$('#' + id + ' div').height(100.0 - (value * 100.0) + '%');
	$('#' + id).toggleClass('yellow', value > 0.45 && value <= 0.7);
	$('#' + id).toggleClass('orange', value > 0.3 && value <= 0.45);
	$('#' + id).toggleClass('red', value <= 0.3);
}

function formatLapTime(sec) {
	return sec <= 0 ? '-' : moment.utc(sec * 1000).format("mm:ss.SSS");
}

function formatTime(sec) {
	return sec < 0 ? '-' : moment.utc(sec * 1000).format("HH:mm:ss");
}

function isNumber(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
}

function convertRpmToPercent(rpm_percent) {
	return Math.pow(rpm_percent, 2) * 100;
}

function updateMaxRpm(maxrpm_tmp, override) {
	if (maxrpm_tmp > MAXRPM || override) {
		MAXRPM = maxrpm_tmp;
	}
}

function createRpmBarMarkers() {
	var rpmBar = $("#rpm_bar");
	
	// Remove old grid lines.
	while (rpmBar.firstChild) {
		rpmBar.removeChild(rpmBar.firstChild);
	}
	
	// Add new grid lines.
	var percentages = Array(15, 25, 50, 70, 80, 90, 95, 98);
	for (var i = 0; i < percentages.length; i++) {
		var line = document.createElement("div");
		line.style.left = convertRpmToPercent(percentages[i] / 100).toFixed(2) + "%";
		rpmBar.append(line); 
	}
}