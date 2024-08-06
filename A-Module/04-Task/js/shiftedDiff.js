/**
 * Write a function that receives two strings and returns the number of characters we would need to rotate the first string forward to match the second.
 *
 * @param {String} first
 * @param {String} second
 * @return {Number}
 */

function shiftedDiff(first, second) {
	/* Work here */
	if (first.length !== second.length) {
		return -1;
	}
	return (second + second).indexOf(first);

}

function handleInput() {
	let result = shiftedDiff(document.getElementById("string1").value, document.getElementById("string2").value)
	document.getElementById("message").innerHTML = result;
}
