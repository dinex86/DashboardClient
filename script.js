var MAXRPM = 0;
var ws = null;

// Screens.
var firstScreen;
var secondScreen;
var pitScreen;

// Elements.
var leds;
var rpmBar;
var fuelLeft;
var lapTime;
var lastLap;
var bestLap;
var sessionTime;
var clock;
var gear;
var speed;
var drsP2p
var drsP2pLabel;
var timeInPitLane;
var pitLimiter;
var delta;
var fuelLaps;
var avgFuel;
var lap;
var pos;
var flag;
var tireTempFL;
var tireTempFR;
var tireTempRL;
var tireTempRR;
var tireWearFL;
var tireWearFR;
var tireWearRL;
var tireWearRR;
var tirePressureFL;
var tirePressureFR;
var tirePressureRL;
var tirePressureRR;
var fuelRequired;
var lapsToGo;
var waterTemp;
var oilTemp;
var airTemp;
var trackTemp;
var deltaFront;
var deltaBehind;
var positionFront;
var positionBehind;
var breakBias;
var tc;
var abs;
var engineBar;
var gearboxBar;
var aeroBar;

$(document).ready(function () {
	initElements();
	window.onclick = function() {
		if (MAXRPM > 0) {
			document.body.webkitRequestFullscreen(function() {}, function() {});
		}
		
		switchScreen(false);
	};
	
	wakeUpServer();
	setInterval(function () { wakeUpServer(); }, 3000);
});

function initElements() {
	firstScreen = $('#first_screen');
	secondScreen = $('#second_screen')
	pitScreen = $('#pit_screen');
	
	leds = $('#leds');
	gear = $('.gear');
	speed = $('.speed');
	
	fuelLeft = $('.fuelleft');
	fuelLaps = $('#fuellaps');
	avgFuel = $('#avgfuel');
	lapsToGo = $('#laps_to_go');
	fuelRequired = $('#fuel_required');
	
	lap = $('#lap');
	pos = $('#pos');
	
	lapTime = $('#laptime');
	lastLap = $('#lastlap');
	bestLap = $('#bestlap');
	sessionTime = $('#sessiontime');
	clock = $('#clock');
	
	delta = $('#delta');
	deltaFront = $('.delta_front');
	deltaBehind = $('.delta_behind');
	positionFront = $('.position_front');
	positionBehind = $('.position_behind');
	
	drsP2p = $('.drs_p2p');
	drsP2pLabel = $('.drs_p2p_label');
	
	timeInPitLane = $('#time_in_pitlane');
	pitLimiter = $('.pitlimiter div');
	
	flag = $('.flag');
	
	tireTempFL = $('#tire_temp_front_left');
	tireTempFR = $('#tire_temp_front_right');
	tireTempRL = $('#tire_temp_rear_left');
	tireTempRR = $('#tire_temp_rear_right');
	
	tireWearFL = $('#tire_wear_front_left');
	tireWearFR = $('#tire_wear_front_right');
	tireWearRL = $('#tire_wear_rear_left');
	tireWearRR = $('#tire_wear_rear_right');
	
	tirePressureFL = $('#tire_pressure_front_left');
	tirePressureFR = $('#tire_pressure_front_right');
	tirePressureRL = $('#tire_pressure_rear_left');
	tirePressureRR = $('#tire_pressure_rear_right');
	
	waterTemp = $('.water_temp');
	oilTemp = $('.oil_temp');
	airTemp = $('.air_temp');
	trackTemp = $('.track_temp');
	
	breakBias = $('.break_bias');
	tc = $('.tc');
	abs = $('.abs');
	
	engineBar = $('.engine_bar');
	gearboxBar = $('.gearbox_bar');
	aeroBar = $('.aero_bar');
	
	// Init RPM bar.
	rpmBar = $('#rpm_bar');
	
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

function switchScreen(inPit) {
	if (inPit) {
		firstScreen.hide();
		secondScreen.hide();
		pitScreen.show();
	} else {
		if (pitScreen.is(':visible')) {
			firstScreen.show();
			pitScreen.hide();
		} else {
			firstScreen.toggle();
			secondScreen.toggle();
		}
	}
	
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
		try {
			var json = JSON.parse(message.data);
		
			if (tmp == false) {
				tmp = true;
				console.info(json);
			}
			
			update(json);
		} catch(e) {
			console.info(message.data);
			ws.close();
		}
	};
}

function update(json) {
	var gearText = parseFloat(json.Gear);
	if (gearText == 0) {
		gearText = 'N';
	} else if (gearText == -1) {
		gearText = 'R';
	}
	
	if (json.CarSpeed == undefined) {
		console.info(json);
		return;
	}
	
	speed.html(json.CarSpeed.toFixed(0));
	gear.html(gearText);
	
	// RPM stuff.	
	if (json.MaxEngineRpm > 0) {
		updateMaxRpm(json.MaxEngineRpm, true);
	} else {
		updateMaxRpm(json.EngineRpm, false);
	}
	var rpm_per = json.EngineRpm/MAXRPM;
	
	rpmBar.width(convertRpmToPercent(rpm_per) + "%");
	
	$("#led1").toggleClass('active', rpm_per >= 0.835);
	$("#led2").toggleClass('active', rpm_per >= 0.850);
	$("#led3").toggleClass('active', rpm_per >= 0.865);
	$("#led4").toggleClass('active', rpm_per >= 0.870);
	
	$("#led5").toggleClass('active', rpm_per >= 0.885);
	$("#led6").toggleClass('active', rpm_per >= 0.900);
	$("#led7").toggleClass('active', rpm_per >= 0.915);
	$("#led8").toggleClass('active', rpm_per >= 0.930);
	
	$("#led9").toggleClass('active',  rpm_per >= 0.945);
	$("#led10").toggleClass('active', rpm_per >= 0.960);
	$("#led11").toggleClass('active', rpm_per >= 0.975);
	$("#led12").toggleClass('active', rpm_per >= 0.990);
	
	// Special styles.
	leds.toggleClass('shift_indicator', json.PitLimiter == 1);
	gear.toggleClass('shift_indicator', rpm_per >= 0.96);
	speed.toggleClass('speed_drs_active', json.DrsEngaged > 0);
	
	// Fuel.
	fuelLaps.html(json.FuelLapsLeftEstimate > 0 ? (Math.floor(json.FuelLapsLeftEstimate * 10) / 10).toFixed(1) : '-');
	fuelLeft.html(json.FuelLeft >= 0 ? (Math.floor(json.FuelLeft * 10) / 10).toFixed(1) : '-');
	avgFuel.html(json.FuelPerLap > 0 ? (Math.ceil(json.FuelPerLap * 10) / 10).toFixed(1) : '-');
	
	fuelLaps.toggleClass('fuel_left_2_laps', json.FuelLapsLeftEstimate >= 0 && json.FuelLapsLeftEstimate <= 2);
	fuelLaps.toggleClass('fuel_left_3_laps', json.FuelLapsLeftEstimate > 2 && json.FuelLapsLeftEstimate <= 3);
	fuelLaps.toggleClass('fuel_left_4_laps', json.FuelLapsLeftEstimate > 3 && json.FuelLapsLeftEstimate <= 4);
	
	lap.html((json.NumberOfLaps > 0 && json.CompletedLaps >= json.NumberOfLaps ? json.NumberOfLaps : json.CompletedLaps + 1) + (json.NumberOfLaps > 0 ? "/" + json.NumberOfLaps : ""));
	pos.html(json.Position + "/" + json.NumCars);
	
	breakBias.html(json.BreakBias >= 0 ? 'F: ' + ((1.0 - json.BreakBias) * 100.0).toFixed(0) + '%' : '-');
	
	// Temps.
	waterTemp.html(json.WaterTemperature > 0 ? json.WaterTemperature.toFixed(0) + '°C' : '-');
	oilTemp.html(json.OilTemperature > 0 ? json.OilTemperature.toFixed(0) + '°C' : '-');
	airTemp.html(json.AirTemperature > 0 ? json.AirTemperature.toFixed(0) + '°C' : '-');
	trackTemp.html(json.TrackTemperature > 0 ? json.TrackTemperature.toFixed(0) + '°C' : '-');
	
	// DRS & P2P
	var drsP2pText = '-';
	var drsP2pLabelText = 'DRS/P2P';
	if (json.DrsEquipped == 1) {
		drsP2pLabelText = 'DRS';
		
		if (json.DrsEngaged > 0) {
			drsP2pText = 'DRS';
		} else if (json.DrsNumActivationsLeft >= 0) {
			drsP2pText = json.DrsNumActivationsLeft > 1000 ? '&infin;' : json.DrsNumActivationsLeft;
		} else {
			drsP2pText = 'DRS';
		}
		
		drsP2p.toggleClass('drs_available', json.DrsAvailable == 1);
		drsP2p.toggleClass('blink', json.DrsEngaged == 1);
	} else if (json.PushToPassEquipped == 1) {
		drsP2pLabelText = 'P2P';
		
		var drsP2pStyle = '';
		if (json.PushToPassEngaged > 0) {
			drsP2pText = json.PushToPassEngagedTimeLeft.toFixed(1);
			drsP2pStyle = 'p2p_engaged';
		} else if (json.PushToPassWaitTimeLeft > 0) {
			drsP2pText = json.PushToPassWaitTimeLeft.toFixed(0);
			drsP2pStyle = 'p2p_cooldown';
		} else if (json.PushToPassAvailable > 0) {
			drsP2pText = json.PushToPassNumActivationsLeft > 1000 ? '&infin;' : json.PushToPassNumActivationsLeft;
		} else {
			drsP2pText = 'P2P';
		}
		
		drsP2p.attr('class', drsP2pStyle);
	}

	drsP2pLabel.html(drsP2pLabelText);
	drsP2p.html(drsP2pText);
	
	// Times.
	lapTime.html(formatLapTime(json.LapTimeCurrentSelf));
	lastLap.html(formatLapTime(json.LapTimePreviousSelf));
	bestLap.html(formatLapTime(json.LapTimeBestSelf));
	sessionTime.html(json.SessionTimeRemaining > 0 ? formatTime(json.SessionTimeRemaining) : getSessionName(json));
	clock.html(moment().local().format("HH:mm:ss"));
	
	//Delta
	if (json.LapTimeCurrentSelf > 0 && json.LapTimeBestSelf > 0) {
		var deltaTime = json.DeltaBestSelf;
		
		delta.html((deltaTime >= 0 ? '+' : '') + deltaTime.toFixed(3));
		delta.toggleClass('positive', deltaTime >= 0);
		delta.toggleClass('negative', deltaTime < 0);
	} else {
		delta.html('-');
		delta.removeClass();
	}
	
	deltaFront.html(json.TimeDeltaFront > 0 ? json.TimeDeltaFront.toFixed(3) : '-');
	deltaFront.toggleClass('positive', json.TimeDeltaFront > 0);
	deltaBehind.html(json.TimeDeltaBehind > 0 ? json.TimeDeltaBehind.toFixed(3) : '-');
	deltaBehind.toggleClass('negative', json.TimeDeltaBehind > 0);
	positionFront.html(json.TimeDeltaFront > 0 ? (json.Position - 1) : '');
	positionBehind.html(json.TimeDeltaBehind > 0 ? (json.Position + 1) : '');
	
	// Flags.
	flag.toggleClass('green', json.CurrentFlag == 0);
	flag.toggleClass('yellow blink', json.CurrentFlag == 1);
	flag.toggleClass('blue blink', json.CurrentFlag == 2);
	flag.toggleClass('black', json.CurrentFlag == 3);
	flag.toggleClass('black_white', json.CurrentFlag == 4);
	flag.toggleClass('white blink', json.CurrentFlag == 5);
	flag.toggleClass('checkered', json.CurrentFlag == 6);
	flag.toggleClass('penalty blink', json.CurrentFlag == 7);
	
	// Tires.
	tireTempFL.html(json.TireTempFrontLeft > -1 ? Math.floor(json.TireTempFrontLeft) + '°C' : 'N/A');
	tireTempFR.html(json.TireTempFrontRight > -1 ? Math.floor(json.TireTempFrontRight) + '°C' : 'N/A');
	tireTempRL.html(json.TireTempRearLeft > -1 ? Math.floor(json.TireTempRearLeft) + '°C' : 'N/A');
	tireTempRR.html(json.TireTempRearRight > -1 ? Math.floor(json.TireTempRearRight) + '°C' : 'N/A');
	
	tireWearFL.html(json.TireWearFrontLeft > -1 ? Math.floor(json.TireWearFrontLeft * 100.0) + '%' : 'N/A');
	tireWearFR.html(json.TireWearFrontRight > -1 ? Math.floor(json.TireWearFrontRight * 100.0) + '%' : 'N/A');
	tireWearRL.html(json.TireWearRearLeft > -1 ? Math.floor(json.TireWearRearLeft * 100.0) + '%' : 'N/A');
	tireWearRR.html(json.TireWearRearRight > -1 ? Math.floor(json.TireWearRearRight * 100.0) + '%' : 'N/A');
	
	tirePressureFL.html(json.TirePressureFrontLeft > -1 ? Math.floor(json.TirePressureFrontLeft) + 'psi' : 'N/A');
	tirePressureFR.html(json.TirePressureFrontRight > -1 ? Math.floor(json.TirePressureFrontRight) + 'psi' : 'N/A');
	tirePressureRL.html(json.TirePressureRearLeft > -1 ? Math.floor(json.TirePressureRearLeft) + 'psi' : 'N/A');
	tirePressureRR.html(json.TirePressureRearRight > -1 ? Math.floor(json.TirePressureRearRight) + 'psi' : 'N/A');
	
	updateTireWear('tire_front_left', json.TireWearFrontLeft, json.TireDirtFrontLeft, json.TirePressureFrontLeft);
	updateTireWear('tire_front_right', json.TireWearFrontRight, json.TireDirtFrontRight, json.TirePressureFrontRight);
	updateTireWear('tire_rear_left', json.TireWearRearLeft, json.TireDirtRearLeft, json.TirePressureRearLeft);
	updateTireWear('tire_rear_right', json.TireWearRearRight, json.TireDirtRearRight, json.TirePressureRearRight);
	
	// Pit screen.
	pitLimiter.toggleClass('active', json.PitLimiter > 0);
	pitLimiter.toggleClass('fast-flash-bg', json.PitLimiter != json.InPitLane);
	
	if (json.PitLimiter == 1 || json.InPitLane == 1 || json.LastTimeInPit + 5000 > json.LastTimeOnTrack) {
		if (!pitScreen.is(':visible')) {
			switchScreen(true);
		}
		
		if (json.LastTimeOnTrack < json.LastTimeInPit) {
			timeInPitLane.html(((json.LastTimeInPit - json.LastTimeOnTrack) / 1000).toFixed(1));
			
			lapsToGo.html(json.LapsUntilSessionEnd.toFixed(1));
			fuelRequired.html(json.FuelRequiredUntilSessionEnd.toFixed(1));
			
			var sufficient = json.FuelLeft >= json.FuelRequiredUntilSessionEnd;
			fuelRequired.toggleClass('fuel_required_sufficient', sufficient);
			fuelRequired.toggleClass('fuel_required_insufficient', !sufficient);
		}
	} else {
		// Only call once.
		if (pitScreen.is(':visible')) {
			switchScreen(false);
		}
		
		timeInPitLane.html('-');
	}
	
	tc.html(json.TractionControl >= 0 ? (json.TractionControl * 100).toFixed(0) + '%' : '-');
	abs.html(json.Abs >= 0 ? (json.Abs * 100).toFixed(0) + '%' : '-');
	
	// 57 = Xbox R3 (right stick)
	// 60 = T300 PS button.
	if (json.PressedButtons.length > 0) {
		console.info(json.PressedButtons);
		if (json.PressedButtons.indexOf('60') != -1) {
			switchScreen();
		}
	}
	
	// Damage overlay.
	engineBar.css('width', (json.DamageEngine * 100.0).toFixed(1) + '%');
	gearboxBar.css('width', (json.DamageTransmission * 100.0).toFixed(1) + '%');
	aeroBar.css('width', (json.DamageAerodynamics * 100.0).toFixed(1) + '%');
}

function updateTireWear(id, wear, dirt, pressure) {
	var yellowUnder = 0.7;
	var orangeUnder = 0.45;
	var redUnder = 0.25;
	
	$('#' + id + ' div.wear').height((pressure == 0 ? 100 : (100.0 - (wear * 100.0))) + '%');
	$('#' + id + ' div.dirt').css('top', (100.0 - (dirt * 100.0)) + '%');
	$('#' + id).toggleClass('state_yellow', pressure != 0 && wear >= orangeUnder && wear < yellowUnder);
	$('#' + id).toggleClass('state_orange', pressure != 0 && wear >= redUnder && wear < orangeUnder);
	$('#' + id).toggleClass('state_red', pressure == 0 || wear < redUnder);
}

function formatLapTime(sec) {
	return sec <= 0 ? '-' : moment.utc(sec * 1000).format("mm:ss.SSS");
}

function formatTime(sec) {
	return sec < 0 ? '-' : moment.utc(sec * 1000).format("HH:mm:ss");
}

function getSessionName(json) {
	
	var format = json.RaceFormat;
	var index = json.Session;
	var iteration = json.SessionIteration;
	
	var iterationText = iteration > 0 ? ' #' + iteration : '';
	if (index == 0) {
		return 'Practice' + iterationText;
	} else if (index == 1) {
		return 'Qualifying' + iterationText;
	} else if (index == 2) {
		if ((format == 2 || format == 0) && json.SessionTimeRemaining <= 0) {
			return 'Last Lap';
		}
		
		return 'Race' + iterationText;
	}
	
	return '-';
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
