"use strict";

import {
	NotationProgenitor,
	NotationContainer
} from "./modules/storage.js";
import { } from "./modules/extensions.js";

//#region Turing Machine
/** @enum {String} */ const Directions = {
	/** @readonly */ left: `left`,
	/** @readonly */ stay: `stay`,
	/** @readonly */ right: `right`,
};
Object.freeze(Directions);

class Request {
	/**
	 * @param {String} text 
	 */
	static parse(text) {
		const match = /^(-?\d+)\s*\(\s*(\w+)\s*\)$/.exec(text);
		if (match === null) throw new SyntaxError(`Invalid request syntax at part '${text}'`);
		const [, state, value] = match;
		return new Request(Number(state), value);
	}
	/**
	 * @param {Number} state 
	 * @param {String} value 
	 */
	constructor(state, value) {
		this.#state = state;
		this.#value = value;
	}
	/** @type {Number} */ #state;
	get state() {
		return this.#state;
	}
	set state(value) {
		this.#state = value;
	}
	/** @type {String} */ #value;
	get value() {
		return this.#value;
	}
	set value(value) {
		this.#value = value;
	}
	toString() {
		return `${this.state}(${this.value})`;
	}
}

class Response extends Request {
	/**
	 * @param {String} text 
	 */
	static parse(text) {
		const match = /^(-?\d+)\s*\(\s*(\w+)\s*\)\s*([L|S|R])$/.exec(text);
		if (match === null) throw new SyntaxError(`Invalid response syntax at part '${text}'`);
		const [, state, value, move] = match;
		return new Response(Number(state), value, (() => {
			switch (move) {
				case `L`: return Directions.left;
				case `S`: return Directions.stay;
				case `R`: return Directions.right;
				default: throw new TypeError(`Invalid move ${move} type`);
			}
		})());
	}
	/**
	 * @param {Number} state 
	 * @param {String} value 
	 * @param {Directions} move 
	 */
	constructor(state, value, move) {
		super(state, value);
		this.#move = move;
	}
	/** @type {Directions} */ #move;
	get move() {
		return this.#move;
	}
	set move(value) {
		this.#move = value;
	}
	toString() {
		return `${this.state}(${this.value}) ${this.move}`;
	}
}

/**
 * @extends {Map<Request, Response>}
 */
class TuringMap extends Map {
	/**
	 * @param {Request} key 
	 * @returns {Response}
	 */
	get(key) {
		const request = Array.from(this.keys()).find((request) => request.state === key.state && request.value === key.value);
		return (request === undefined) ?
			new Response(key.state, key.value, Directions.stay) :
			super.get(request) ?? (() => { throw new ReferenceError(`Request ${request} is missing`); })();
	}
	/**
	 * @param {Request} key 
	 * @param {Response} value
	 * @returns {this}
	 */
	set(key, value) {
		const request = Array.from(this.keys()).find((request) => request.state === key.state && request.value === key.value) ?? key;
		super.set(request, value);
		return this;
	}
}

/**
 * @extends {Array<String>}
 */
class TapeRecord extends Array {
	/**
	 * @param {String} text 
	 * @returns {[Request, Response]}
	 */
	static parse(text) {
		const match = /^(\S.*\S)\s*=>\s*(\S.*\S)$/.exec(text);
		if (match === null) throw new SyntaxError(`Invalid line syntax at part '${text}'`);
		const [, request, response] = match;
		try {
			return [Request.parse(request), Response.parse(response)];
		} catch (error) {
			throw new SyntaxError(`Invalid line syntax at part '${text}'`, { cause: error });
		}
	}
	/**
	 * @param {Request} request 
	 * @param {Number} index 
	 * @param  {String[]} tape 
	 */
	constructor(request, index, tape) {
		super(...tape);
		this.#request = request;
		this.#index = index;
	}
	/** @type {Request} */ #request;
	/** @readonly */ get request() {
		return this.#request;
	}
	/** @type {Number} */ #index;
	/** @readonly */ get index() {
		return this.#index;
	}
	toString() {
		const tape = Array.from(this);
		tape[this.index] = `<mark>${tape[this.index]}</mark>`;
		return tape.join(` `);
	}
}

class TuringMachine {
	/**
	 * @param {String} initial 
	 */
	constructor(initial) {
		this.#initial = initial;
	}
	/** @type {String} */ #initial;
	/** @type {TuringMap} */ #instructions = new TuringMap();
	/** @readonly */ get instructions() {
		return this.#instructions;
	}
	/**
	 * @param {String[]} tape 
	 * @returns {Generator<TapeRecord, TapeRecord, unknown>}
	 */
	*launch(tape) {
		for (let index = 0, state = 0; true;) {
			const request = new Request(state, tape[index] ?? (() => {
				throw new RangeError(`Index ${index} is out of range [0 - ${tape.length})`);
			})());
			const record = new TapeRecord(request, index, tape);
			if (state < 0) {
				return record;
			} else yield record;
			const response = this.instructions.get(request);
			state = response.state;
			tape[index] = response.value;
			switch (response.move) {
				case Directions.left: {
					index--;
					for (; index < 0; index++) {
						tape.unshift(this.#initial);
					}
				} break;
				case Directions.stay: { } break;
				case Directions.right: {
					index++;
					for (; index >= tape.length;) {
						tape.push(this.#initial);
					}
				} break;
				default: throw new TypeError(`Invalid ${response.move} direction`);
			}
		}
	}
}
//#endregion
//#region Settings
/**
 * @typedef SettingsNotation
 * @property {String} [instructions]
 * @property {String} [tape]
 */

class Settings extends NotationProgenitor {
	/**
	 * @param {SettingsNotation} source 
	 * @returns {Settings}
	 */
	static import(source) {
		const result = new Settings();
		if (!(typeof (source) === `object`)) {
			throw new TypeError(`Source has invalid ${typeof (source)} type`);
		}
		const instructions = Reflect.get(source, `instructions`);
		if (instructions !== undefined) {
			if (!(typeof (instructions) === `string`)) {
				throw new TypeError(`Property instructions has invalid ${typeof (instructions)} type`);
			}
			result.instructions = instructions;
		}
		const tape = Reflect.get(source, `tape`);
		if (tape !== undefined) {
			if (!(typeof (tape) === `string`)) {
				throw new TypeError(`Property tape has invalid ${typeof (tape)} type`);
			}
			result.tape = tape;
		}
		return result;
	}
	/**
	 * @param {Settings} source 
	 * @returns {SettingsNotation}
	 */
	static export(source) {
		const result = (/** @type {SettingsNotation} */ ({}));
		result.instructions = source.instructions;
		result.tape = source.tape;
		return result;
	}
	/** @type {String[]} */ static #themes = [`system`, `light`, `dark`];
	/** @readonly */ static get themes() {
		return Object.freeze(this.#themes);
	}
	/** @type {String} */ #instructions = `0(1) => 0(1) R\n0(sum) => 1(1) L\n1(1) => 1(1) L\n1(0) => 2(0) R\n2(1) => -1(0) R`;
	get instructions() {
		return this.#instructions;
	}
	set instructions(value) {
		this.#instructions = value;
	}
	/** @type {String} */ #tape = `1 1 1 1 1 1 1 1 sum 1 1 1 1`;
	get tape() {
		return this.#tape;
	}
	set tape(value) {
		this.#tape = value;
	}
}
//#endregion
//#region Metadata
const developer = document.getElement(HTMLMetaElement, `meta[name="author"]`).content;
const title = document.getElement(HTMLMetaElement, `meta[name="application-name"]`).content;
const containerSettings = new NotationContainer(Settings, `${developer}.${title}.Settings`);
const search = location.getSearchMap();
const theme = search.get(`theme`);
if (theme !== undefined && Settings.themes.includes(theme)) {
	document.documentElement.dataset[`theme`] = theme;
}
const reset = search.get(`reset`);
switch (reset) {
	case `settings`: {
		containerSettings.reset();
	}
	default: break;
}
const settings = containerSettings.content;
//#endregion

export {
	Directions,
	Request,
	Response,
	TuringMap,
	TapeRecord,
	TuringMachine,
	Settings,
	containerSettings,
	settings,
	search
};