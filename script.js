var MAXRPM = 0;
var shiftindicator = 0.985;
var ws = null;

$(document).ready(function ()
{
	createRpmBarMarkers();
	wakeUpServer();
	setInterval(function () { wakeUpServer(); }, 3000);
});

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
	if (json.MaxEngineRpm == 0) {
		document.getElementById("gear").innerHTML = '&nbsp;WAIT&nbsp;';
		document.getElementById("speed").innerHTML = '&nbsp;NO&nbsp;GAME&nbsp;FOUND&nbsp;';
		return;
	}
	
	var gear = parseFloat(json.Gear);		
	if (gear == 0) gear = 'N';
	else if (gear == -1) gear = 'R';
	
	if (json.CarSpeed == undefined) {
		console.info(json);
		return;
	}
	
	document.getElementById("speed").innerHTML = json.CarSpeed.toFixed(0);
	document.getElementById("gear").innerHTML = gear;
	
	// RPM stuff.	
	if (json.MaxEngineRpm > 0)
	{
		updateMaxRpm(json.MaxEngineRpm, true);	
	}
	else
	{
		updateMaxRpm(json.EngineRpm, false);
	}
	var rpm_per = json.EngineRpm/MAXRPM;
	
	//document.getElementById("rpm").innerHTML = json.EngineRps.toFixed(0);
	document.getElementById("rpm_bar").style.width = convertRpmToPercent(rpm_per) + "%";
	
	document.getElementById("led1").className = rpm_per >= 0.500 ? "green" : "";
	document.getElementById("led2").className = rpm_per >= 0.575 ? "green" : "";
	document.getElementById("led3").className = rpm_per >= 0.650 ? "green" : "";
	document.getElementById("led4").className = rpm_per >= 0.725 ? "green" : "";
	
	document.getElementById("led5").className = rpm_per >= 0.80 ? "yellow" : "";
	document.getElementById("led6").className = rpm_per >= 0.83 ? "yellow" : "";
	document.getElementById("led7").className = rpm_per >= 0.86 ? "yellow" : "";
	document.getElementById("led8").className = rpm_per >= 0.89 ? "yellow" : "";
	
	document.getElementById("led9").className  = rpm_per >= 0.91 ? "red" : "";
	document.getElementById("led10").className = rpm_per >= 0.93 ? "red" : "";
	document.getElementById("led11").className = rpm_per >= 0.95 ? "red" : "";
	document.getElementById("led12").className = rpm_per >= 0.97 ? "red" : "";
	
	// Special styles.
	document.getElementById("leds").className = rpm_per >= shiftindicator || json.PitLimiter ? "blink" : "";
	document.getElementById("gear").className = rpm_per >= shiftindicator ? "shift_indicator blink" : "";
	document.getElementById("speed").className = json.DrsEngaged ? "speed_drs_active" : "";
	
	// Fuel.
	document.getElementById("fuellaps").innerHTML = json.FuelLapsLeftEstimate > 0 ? (Math.floor(json.FuelLapsLeftEstimate * 10) / 10).toFixed(1) : "-";
	document.getElementById("fuel").innerHTML = (Math.floor(json.FuelLeft * 10) / 10).toFixed(1);
	document.getElementById("avgfuel").innerHTML = json.FuelPerLap > 0 ? (Math.ceil(json.FuelPerLap * 10) / 10).toFixed(1) : "-";
	
	document.getElementById("lap").innerHTML = (json.NumberOfLaps > 0 && json.CompletedLaps >= json.NumberOfLaps ? json.NumberOfLaps : json.CompletedLaps + 1) + (json.NumberOfLaps > 0 ? "/" + json.NumberOfLaps : "");
	document.getElementById("pos").innerHTML = json.Position + "/" + json.NumCars;
	
	document.getElementById("pitlimiter").innerHTML = json.PitLimiter == 1 ? 'yes' : 'no';
	
	// DRS
	var drsText = '-';
	var drsStyle = '';
	if (json.DrsEquipped == 1) {
		if (json.DrsEngaged > 0) {
			drsText = 'ACTIVE';
		} else if (json.DrsNumActivationsLeft >= 0) {
			drsText = json.DrsNumActivationsLeft > 1000 ? '∞' : json.DrsNumActivationsLeft;
		} else {
			drsText = 'DRS';
		}
		
		if (json.DrsAvailable == 0) {
			// Style.
			drsStyle = 'drs_available';
		}
	}

	document.getElementById("drs").innerHTML = drsText;
	document.getElementById("drs").className = drsStyle;
	
	//P2P
	var p2pText = '-';
	var p2pStyle = '';
	if (json.DrsEquipped == 1) {
		if (json.PushToPassEngaged > 0) {
			p2pText = json.PushToPassEngagedTimeLeft.toFixed(1);
			p2pStyle = 'p2p_engaged';
		} else if (json.PushToPassWaitTimeLeft >= 0) {
			p2pText = json.PushToPassWaitTimeLeft.toFixed(1);
			p2pStyle = 'p2p_cooldown';
		} else if (PushToPassAvailable > 0) {
			p2pText = json.PushToPassNumActivationsLeft > 1000 ? '∞' : json.PushToPassNumActivationsLeft;
		} else {
			p2pText = 'P2P';
		}
	}

	document.getElementById("p2p").innerHTML = p2pText;
	document.getElementById("p2p").className = p2pStyle;
	
	// Times.
	document.getElementById("laptime").innerHTML = formatLapTime(json.LapTimeCurrentSelf);
	document.getElementById("lastlap").innerHTML = formatLapTime(json.LapTimePreviousSelf);
	document.getElementById("bestlap").innerHTML = formatLapTime(json.LapTimeBestSelf);
	document.getElementById("sessiontime").innerHTML = formatTime(json.SessionTimeRemaining);
	document.getElementById("clock").innerHTML = formatTime(Math.floor(Date.now() / 1000));
	
	//var delta = json.DeltaStats + "/" + json.DeltaLastLap + "/" + json.DeltaBestLap;
	var delta = json.Delta;
	/*if (json.LapTimeBest != '00:00:000' && json.SectorTimeDeltaSelf.Sector1 != 0)
	{
		delta += json.SectorTimeDeltaSelf.Sector1 - json.SectorTimeBestSelf.Sector1;
	
		if (json.SectorTimeDeltaSelf.Sector2 != 0)
		{
			delta += json.SectorTimeDeltaSelf.Sector2 - json.SectorTimeBestSelf.Sector2;
		
			if (json.SectorTimeDeltaSelf.Sector3 != 0)
			{
				delta += json.SectorTimeDeltaSelf.Sector3 - json.SectorTimeBestSelf.Sector3;
			}
		}
	}*/
	
	document.getElementById("delta").innerHTML = (delta >= 0 ? '+' : '') + delta.toFixed(3);
	document.getElementById("delta").className = delta >= 0 ? 'positive' : 'negative';
	
	// Flags.
	/*var x = document.getElementsByClassName("flag");
	for (var i = 0; i < x.length; i++)
	{
		var className = "ledbox flag";
		
		if (json.Flags.StatusId > 0)
		{
			//className += " flag_" + json.Flags.StatusId;
		}
		
		x[i].className = className;
	}*/
}

function formatLapTime(sec) {
	return sec < 0 ? '' : moment.utc(sec * 1000).format("mm:ss.SSS");
}

function formatTime(sec) {
	return sec < 0 ? '' : moment.utc(sec * 1000).format("HH:mm:ss");
}

function isNumber(n)
{
	return !isNaN(parseFloat(n)) && isFinite(n);
}

function convertRpmToPercent(rpm_percent)
{
	return Math.pow(rpm_percent, 2) * 100;
}

function updateMaxRpm(maxrpm_tmp, override)
{
	if (maxrpm_tmp > MAXRPM || override) {
		MAXRPM = maxrpm_tmp;
	}
}

function createRpmBarMarkers()
{
	var rpmBar = document.getElementById("rpm_bar");
	
	// Remove old grid lines.
	while (rpmBar.firstChild) {
		rpmBar.removeChild(rpmBar.firstChild);
	}
	
	// Add new grid lines.
	var percentages = Array(15, 25, 50, 70, 80, 90, 95, 98);
	for (var i = 0; i < percentages.length; i++) {
		var line = document.createElement("div");
		line.style.left = convertRpmToPercent(percentages[i] / 100).toFixed(2) + "%";
		rpmBar.appendChild(line); 
	}
}