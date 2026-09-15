(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	} else {
		root.DemoIntAddress = factory();
	}
}(typeof self !== 'undefined' ? self : this, function () {
	'use strict';
	const CSS_PREFIX = 'DemoIntAddress-';
	const EVENT_NAMESPACE = 'DemoIntAddress-';
	const PRECISION_ADDRESS = 'Address';
	const DEBOUNCE_MS = 250;

	function DemoIntAddress(elementsOrSelector, options) {
		this.options = Object.assign({
			autocompleteUrl: '',
			addressDetailsUrl: '',
			context: 'nld',
			autoFocus: false,
			autoSelect: false,
			minLength: 1,
			prefixMatch: false,
			lowercaseContext: true,
			cssPrefix: CSS_PREFIX,
		}, options || {});

		this.matches = [];
		this.activeIndex = -1;
		this.xhr = null;
		this.debounceTimer = null;
		this.isOpen = false;

		const input = typeof elementsOrSelector === 'string' ? document.querySelector(elementsOrSelector) : elementsOrSelector;

		if (!input) { throw new Error('DemoIntAddress: target input element not found.'); }

		if (input.DemoIntAddressInstance && typeof input.DemoIntAddressInstance.destroy === 'function') {
			input.DemoIntAddressInstance.destroy();
		}

		this.input = input;
		this.context = this._normalizeContext(this.options.context);
		this.initialContext = this.context;
		input.DemoIntAddressInstance = this;

		this._build();
		this._bind();
	}

	DemoIntAddress.prototype._normalizeContext = function (context) {
		const value = String(context || '');

		return this.options.lowercaseContext ? value.toLowerCase() : value;
	};

	DemoIntAddress.prototype._build = function () {
		const prefix = this.options.cssPrefix;

		this.input.setAttribute('role', 'combobox');
		this.input.setAttribute('aria-autocomplete', 'list');
		this.input.setAttribute('aria-expanded', 'false');
		this.input.classList.add(prefix + 'input');

		const wrapper = this.input.parentElement;

		if (!wrapper) {
			throw new Error('DemoIntAddress: input element requires a parent element.');
		}

		wrapper.classList.add(prefix + 'wrapper');

		const menuWrapper = document.createElement('div');
		menuWrapper.classList.add(prefix + 'menu');

		const menu = document.createElement('ul');
		menu.classList.add(prefix + 'menu-items');
		menu.setAttribute('role', 'listbox');

		menuWrapper.appendChild(menu);
		document.body.appendChild(menuWrapper);

		this.wrapper = wrapper;
		this.menuWrapper = menuWrapper;
		this.menu = menu;
	};

	DemoIntAddress.prototype._positionMenu = function () {
		const rect = this.input.getBoundingClientRect();

		this.menuWrapper.style.top = (rect.bottom + window.scrollY) + 'px';
		this.menuWrapper.style.left = (rect.left + window.scrollX) + 'px';

		this.menuWrapper.style.width = rect.width + 'px';
	};

	DemoIntAddress.prototype._bind = function () {
		const self = this;

		this._onInput = function () {
			self.context = self.initialContext;
			window.clearTimeout(self.debounceTimer);

			const value = self.input.value.trim();

			if (value.length < self.options.minLength) {
				self.close();
				return;
			}

			self.debounceTimer = window.setTimeout(function () { self._fetchSuggestions(value); }, DEBOUNCE_MS);
		};

		this._onFocus = function () {
			self.open();
		};

		this._onKeydown = function (e) {
			if (!self.isOpen) { return; }

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					self._move(1);
					break;

				case 'ArrowUp':
					e.preventDefault();
					self._move(-1);
					break;

				case 'Enter':
					if (self.activeIndex > -1) {
						e.preventDefault();
						self._select(self.activeIndex);
					}
					break;

				case 'Escape':
					self.close();
					break;
			}
		};

		this._onDocClick = function (e) {
			if (!self.wrapper.contains(e.target) && !self.menuWrapper.contains(e.target)) { self.close(); }
		};

		this._onResize = function () {
			if (self.isOpen) { self._positionMenu(); }
		};

		this.input.addEventListener('input', this._onInput);

		this.input.addEventListener('focus', this._onFocus);

		this.input.addEventListener('keydown', this._onKeydown);

		document.addEventListener('click', this._onDocClick);

		window.addEventListener('resize', this._onResize);

		if (this.options.autoFocus) { this.input.focus(); }
	};

	DemoIntAddress.prototype.open = function () {
		if (this.isOpen || !this.menu.children.length) { return; }

		this._positionMenu();
		this.menuWrapper.classList.add(this.options.cssPrefix + 'menu-open');
		this.input.setAttribute('aria-expanded', 'true');
		this.isOpen = true;
		this.input.dispatchEvent(new CustomEvent(EVENT_NAMESPACE + 'open', { bubbles: true }));
	};

	DemoIntAddress.prototype.close = function () {
		if (!this.isOpen) { return; }

		this.menuWrapper.classList.remove(this.options.cssPrefix + 'menu-open');
		this.input.setAttribute('aria-expanded', 'false');

		this.activeIndex = -1;
		this.isOpen = false;
		this.input.dispatchEvent(new CustomEvent(EVENT_NAMESPACE + 'close', { bubbles: true }));
	};

	DemoIntAddress.prototype._fetchSuggestions = function (term) {
		const self = this;
		const url = this.options.autocompleteUrl.replace(/\/+$/, '') + '?context=' + encodeURIComponent(this.initialContext) + '&query=' + encodeURIComponent(term);

		this._xhrGet(url, function (data) {
			const matches = self._filterMatches(data && Array.isArray(data.matches) ? data.matches : [], term);

			self._render(matches);

			if (self.options.autoSelect && matches.length === 1 && matches[0].precision === PRECISION_ADDRESS) { self._select(0); }
		});
	};

	DemoIntAddress.prototype._filterMatches = function (matches, term) {
		if (!term) { return matches; }

		const normalize = function (value) {
			return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
		};

		const searchTerm = normalize(term).replace(/\s/g, '');

		return matches.filter(function (match) {
			const label = normalize(match.label || match.value || '');
			const description = normalize(match.description || '');
			const combined = (label + ' ' + description).replace(/\s/g, '');

			return combined.includes(
				searchTerm
			);
		});
	};

	DemoIntAddress.prototype._render = function (matches) {
		const self = this;
		const prefix = this.options.cssPrefix;

		this.matches = matches;
		this.activeIndex = -1;
		this.menu.innerHTML = '';

		if (!matches.length) {
			this.close();
			return;
		}

		matches.forEach(function (match, index) {
			const li = document.createElement('li');

			li.classList.add(prefix + 'item');

			li.setAttribute('role', 'option');

			const label = document.createElement('span');

			label.classList.add(prefix + 'item-label');

			label.textContent = match.label || match.value || '';
			li.appendChild(label);

			if (match.description) {
				const description = document.createElement('span');

				description.classList.add(prefix + 'item-description');

				description.textContent = match.description;
				li.appendChild(description);
			}

			li.addEventListener('mouseenter', function () {
				self._setActive(index);
			});

			li.addEventListener('mousedown', function (e) {
				e.preventDefault();
				self._select(index);
			});

			self.menu.appendChild(li)
		});

		this.open();
	};

	DemoIntAddress.prototype._move = function (delta) {
		const count = this.matches.length;

		if (!count) { return; }

		let next = this.activeIndex + delta;

		if (next < 0) {
			next = count - 1;
		} else if (next >= count) { next = 0; }

		this._setActive(next);
	};

	DemoIntAddress.prototype._setActive = function (index) {
		const prefix = this.options.cssPrefix;
		const items = this.menu.children;

		if (this.activeIndex > -1 && items[this.activeIndex]) {
			items[this.activeIndex].classList.remove(prefix + 'item-active');
		}

		this.activeIndex = index;

		if (index > -1 && items[index]) {
			items[index].classList.add(prefix + 'item-active');
			items[index].scrollIntoView({ block: 'nearest' });
		}
	};

	DemoIntAddress.prototype._select = function (index) {
		const match = this.matches[index];
		if (!match) { return; }

		if (match.precision === PRECISION_ADDRESS) {
			this._fetchDetails(match.context);
			this.close();
			return;
		}

		this.activeIndex = -1;
		this._fetchSuggestions('');
		this.input.focus();
	};

	DemoIntAddress.prototype._fetchDetails = function (addressId) {
		const self = this;
		const url = this.options.addressDetailsUrl.replace('${query}', encodeURIComponent(addressId));

		this._xhrGet(url, function (details) {
			if (!details) { return; }

			const result = details.result || details;
			const street = [
				result.street || '',
				result.houseNumber || result.housenumber || '',
				result.addition || ''
			].filter(Boolean).join(' ');

			const fullAddress = [
				street,
				result.postalCode || result.postcode || '',
				result.city || ''
			].filter(Boolean).join(', ');

			details.label = fullAddress;
			self.input.value = fullAddress;

			self.input.dispatchEvent(new CustomEvent(EVENT_NAMESPACE + 'details', {
				detail: details,
				bubbles: true
			}));
		});
	};

	DemoIntAddress.prototype._xhrGet = function (url, onSuccess) {
		const self = this;

		if (this.xhr && this.xhr.readyState < 4) {
			this.xhr.abort();
		}

		const xhr = new XMLHttpRequest();
		this.xhr = xhr;

		this.input.classList.add(this.options.cssPrefix + 'loading');

		xhr.addEventListener('load', function () {
			if (xhr.status === 200) {
				let data = null;

				try {
					data = JSON.parse(xhr.responseText);
				} catch (e) {
					data = null;
				}

				onSuccess(data);
			} else {
				self.input.dispatchEvent(new CustomEvent(EVENT_NAMESPACE + 'error', {
					detail: { request: xhr },
					bubbles: true
				}));
			}
		});

		xhr.addEventListener('error', function (e) {
			self.input.dispatchEvent(
				new CustomEvent(EVENT_NAMESPACE + 'error', {
					detail: { event: e, request: xhr },
					bubbles: true
				})
			);
		});

		xhr.addEventListener('loadend', function () {
			self.input.classList.remove(self.options.cssPrefix + 'loading');
		});

		xhr.open('GET', url);
		xhr.send();
	};

	DemoIntAddress.prototype.setContext = function (context) {
		this.context = this._normalizeContext(context);
		this.initialContext = this.context;
	};

	DemoIntAddress.prototype.destroy = function () {
		window.clearTimeout(this.debounceTimer);

		if (this.xhr && this.xhr.readyState < 4) {
			this.xhr.abort();
		}

		this.input.removeEventListener('input', this._onInput);

		this.input.removeEventListener('focus', this._onFocus);

		this.input.removeEventListener('keydown', this._onKeydown);

		document.removeEventListener('click', this._onDocClick);

		window.removeEventListener('resize', this._onResize);

		if (this.menuWrapper && this.menuWrapper.parentNode) {
			this.menuWrapper.parentNode.removeChild(this.menuWrapper);
		}

		if (this.wrapper) {
			this.wrapper.classList.remove(this.options.cssPrefix + 'wrapper');
		}

		this.input.classList.remove(this.options.cssPrefix + 'input');

		this.input.classList.remove(this.options.cssPrefix + 'loading');

		if (this.input.DemoIntAddressInstance === this) {
			this.input.DemoIntAddressInstance = null;
		}
	};

	return DemoIntAddress;
}));