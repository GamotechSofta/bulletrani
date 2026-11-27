import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAmount, formatMoney, getUiStrings } from './currencyLang.js';
import {
  isSafeCloseUrl,
  readOperationsLaunchParams,
  hasOperationsLaunch
} from './operationsParams.js';

test('currencyLang formats INR and ISO currencies properly', () => {
  assert.equal(formatMoney(1234.5, 'INR', 'en'), '₹1,234.50');
  assert.equal(formatMoney(99.5, 'USD', 'en'), '$99.50');
  assert.equal(formatMoney(50, 'AED', 'en'), 'AED 50.00');
  assert.equal(formatAmount(5000, 'en', 'INR'), '5,000.00');
});

test('getUiStrings returns localized strings with English fallback', () => {
  assert.equal(getUiStrings('en').bet, 'BET');
  assert.equal(getUiStrings('hi').bet, 'बेट');
  assert.equal(getUiStrings('fr').bet, 'BET');
});

test('readOperationsLaunchParams parses all Launch & Boot query params with defaults', () => {
  const qs = '?token=t1&partner_code=ALPHA-TEST&gid=55&game_code=BULLETRANI&username=Ace&user_id=9&extsess=ex1&close_url=https%3A%2F%2Flobby.test';
  assert.equal(hasOperationsLaunch(qs), true);
  assert.equal(hasOperationsLaunch('?sessionToken=legacy'), false);

  const parsed = readOperationsLaunchParams(qs);
  assert.equal(parsed.token, 't1');
  assert.equal(parsed.partnerCode, 'ALPHA-TEST');
  assert.equal(parsed.gid, '55');
  assert.equal(parsed.gameCode, 'BULLETRANI');
  assert.equal(parsed.username, 'Ace');
  assert.equal(parsed.userId, '9');
  assert.equal(parsed.currency, 'INR');
  assert.equal(parsed.lang, 'en');
  assert.equal(parsed.extsess, 'ex1');
  assert.equal(parsed.closeUrl, 'https://lobby.test');
});

test('isSafeCloseUrl blocks javascript and protocol-relative URLs', () => {
  assert.equal(isSafeCloseUrl('https://lobby.example.com/home'), true);
  assert.equal(isSafeCloseUrl('/lobby'), true);
  assert.equal(isSafeCloseUrl('//evil.example.com'), false);
  assert.equal(isSafeCloseUrl('javascript:alert(1)'), false);
  assert.equal(isSafeCloseUrl(''), false);
});
