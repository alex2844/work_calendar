#!/usr/bin/env node

createCalendar = (year, month, schedule) => {
	var calendar = $('#calendar');
	var date = new Date(year, month - 1);
	var currentDate = new Date();
	var table = $('<table>').firstElementChild;
	table.classList.add('calendar-table');
	var monthHeader = $('<caption>').firstElementChild;
	monthHeader.classList.add('month-header');
	monthHeader.textContent = date.toLocaleString('default', {
		month: 'long',
		year: 'numeric'
	});
	table.append(monthHeader);
	var thead = $('<thead>').firstElementChild;
	var weekdaysRow = $('<tr>').firstElementChild;
	date.setDate(date.getDate() - date.getDay() + 1);
	for (let i = 0; i < 7; i++) {
		var weekday = $('<th>').firstElementChild;
		weekday.textContent = date.toLocaleString('default', { weekday: 'short' });
		weekdaysRow.append(weekday);
		date.setDate(date.getDate() + 1);
	}
	thead.append(weekdaysRow);
	table.append(thead);
	var tbody = $('<tbody>').firstElementChild;
	var firstDay = new Date(year, month -1, 1);
	var lastDay = new Date(year, month, 0);
	var currentYear = currentDate.getFullYear();
	var currentMonth = currentDate.getMonth();
	var currentDay = currentDate.getDate();
	var currentRow = $('<tr>').firstElementChild;
	var emptyCellsCount = firstDay.getDay() - 1;
	if (emptyCellsCount === -1)
		emptyCellsCount = 6;
	for (var i = 0; i < emptyCellsCount; i++) {
		var emptyCell = $('<td>').firstElementChild;
		currentRow.append(emptyCell);
	}
	for (var day = 1; day <= lastDay.getDate(); day++) {
		var date = new Date(year, month - 1, day);
		var cell = $('<td>').firstElementChild;
		cell.textContent = day;
		if (schedule)
			for (var i = 0; i < schedule.length; i++) {
				var interval = schedule[i];
				var startOfDay = new Date(interval.from.getFullYear(), interval.from.getMonth(), interval.from.getDate());
				var endOfDay = new Date(interval.to.getFullYear(), interval.to.getMonth(), interval.to.getDate(), 23, 59, 59);
				if ((date >= startOfDay) && (date <= endOfDay)) {
					cell.classList.add('working-'+interval.title);
					schedule.splice(i, 1);
					break;
				}
			}
		if (date.getFullYear() === currentYear && date.getMonth() === currentMonth && day === currentDay)
			cell.classList.add('current-day');
		if (date.getDay() === 0 || date.getDay() === 6)
			cell.classList.add('weekend');
		currentRow.append(cell);
		if (date.getDay() === 0 || day === lastDay.getDate()) {
			tbody.append(currentRow);
			currentRow = $('<tr>').firstElementChild;
		}
	}
	table.append(tbody);
	calendar.append(table);
	return calendar;
};
createSchedule = date => {
	let result = [];
	let days = Math.ceil((new Date(date.getFullYear() + 1, 0, 1).getTime() - date.getTime()) / (1000 * 3600 * 24));
	if (days < 60)
		days += 365;
	for (let i = 0; i < days; i++) {
		const work = i % 4 + 1;
		if (work === 1)
			result.push({
				from: new Date(date.setHours(8, 0, 0)),
				to: new Date(date.setHours(20, 0, 0)),
				title: 'day'
			});
		if (work === 2) {
			result.push({
				from: new Date(date.setHours(20, 0, 0)),
				to: new Date(new Date(date.setDate(date.getDate() + 1)).setHours(8, 0, 0)),
				title: 'night'
			});
			continue;
		}
		date.setDate(date.getDate() + 1);
	}
	return result;
};
loadJs = src => new Promise((res, rej) => {
	const filename = src.split('/').slice(-1).join();
	let script = document.querySelector('script[data-filename="'+filename+'"]');
	if (script)
		return res(script);
	script = document.createElement('script');
	script.src = src;
	script.dataset.filename = filename;
	script.on('load', () => res(script));
	document.body.append(script);
});
downloadPNG = () => {
	loadJs('https://html2canvas.hertzen.com/dist/html2canvas.min.js').then(() => {
		html2canvas(document.querySelector('#calendar')).then(canvas => {
			canvas.toBlob(blob => {
				const url = URL.createObjectURL(blob);
				const link = $('<a>').firstElementChild;
				link.href = url;
				link.download = 'screenshot.png';
				document.body.append(link);
				link.click();
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
			}, 'image/png');
		});
	});
};
downloadICS = () => {
	const filename = 'calendar.ics';
	let icsContent = [ 'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Your Company//Calendar//EN' ].join('\n');
	$('#calendar').schedule.forEach(interval => {
		icsContent += [
			'',
			'BEGIN:VEVENT',
			'DTSTART:'+interval.from.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z'),
			'DTEND:'+interval.to.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z'),
			'SUMMARY:'+interval.title,
			'END:VEVENT'
		].join('\n');
	});
	icsContent += '\n' + 'END:VCALENDAR';
	if (typeof(window) === 'object') {
		const blob = new Blob([ icsContent ], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const link = $('<a>').firstElementChild;
		link.href = url;
		link.download = filename;
		document.body.append(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}else
		require('fs').writeFileSync(filename, icsContent);
};
args = (argv, links) => {
	let result = {};
	if (argv) {
		if (argv.constructor.name === 'Object')
			return argv;
		if (argv.constructor.name === 'String')
			return Object.fromEntries(new URLSearchParams(argv));
		if (argv.constructor.name === 'Array')
			for (let i = 0; i < argv.length; i++) {
				let key = null;
				if (argv[i].startsWith('--'))
					key = argv[i].substring(2);
				else if (links && argv[i].startsWith('-'))
					key = links[argv[i].substring(1)];
				if (key)
					result[key] = ((argv[i + 1] && !argv[i + 1].startsWith('-')) ? argv[i + 1] : true);
			}
	}
	return result;
}
main = argv => {
	const argj = args(argv, { 'dl': 'download' });
	if (!argj.startDate) {
		if (typeof(window) === 'object')
			init();
		throw new Error('Date start not found');
	}
	var schedule = createSchedule(new Date(argj.startDate));
	$('#calendar').schedule = [].concat(schedule);
	while (schedule.length > 0) {
		var date = schedule[0].from;
		createCalendar(date.getFullYear(), date.getMonth() + 1, schedule);
	}
	if (typeof(window) === 'object')
		document.querySelector('#save').hidden = false;
	else{
		console.table([ 'Выходной', 'Дневная смена', 'Ночная смена' ]);
		console.table($('#calendar').childs.reduce((obj, cur) => {
			let month = cur.childs[0].textContent;
			obj[month] = {};
			cur.childs[2].childs.forEach(tr => tr.childs.forEach(td => {
				if (td.classList.contains('working-day'))
					obj[month][td.textContent] = 1;
				else if (td.classList.contains('working-night'))
					obj[month][td.textContent] = 2;
				else if (td.textContent)
					obj[month][td.textContent] = 0;
			}));
			return obj;
		}, {}));
	}
	if (argj.download)
		downloadICS();
};
init = () => {
	qad.$('#alert_dialog').popup().then(e => {
		if (e)
			main(e);
		else
			init();
	});
};
if (typeof(module) == 'object') {
	$ = el => {
		let childs = [];
		let classList = [];
		classList.add = cls => classList.push(cls);
		classList.contains = cls => classList.includes(cls);
		let firstElementChild = {
			el,
			classList,
			childs,
			append: child => childs.push(child)
		};
		if ((el.slice(0, 1) === '<') && (el.slice(-1) === '>'))
			return { firstElementChild }
		if (typeof($.data) === 'undefined')
			$.data = {};
		if (typeof($.data[el]) === 'undefined')
			$.data[el] = firstElementChild;
		return $.data[el];
	}
	main(process.argv);
}
