import {score, settle} from './engine.mjs';

export const winds = ['東', '南', '西', '北'];
export const relations = ['莊家', '下家', '對家', '上家'];
export const diceDefaults = {
  diceRun: false, diceRed: false, diceTriple: false, diceStack: false,
  runTai: 1, redTai: 2, tripleTai: 3, tripleMode: 'double'
};

export const validDice = dice => Array.isArray(dice) && dice.length === 3 &&
  dice.every(n => Number.isInteger(n) && n >= 1 && n <= 6);
const seatIndex = n => Number.isInteger(n) && n >= 0 && n < 4;
export function validOpening(o, allowDraft = false) {
  if (!o || !seatIndex(o.dealer) || !Array.isArray(o.names) || o.names.length !== 4 ||
      !o.names.every(n => typeof n === 'string' && n.length <= 24) ||
      !Array.isArray(o.seats) || o.seats.length !== 4 || !o.seats.every(seatIndex) ||
      new Set(o.seats).size !== 4) return false;
  if (validDice(o.dice)) return true;
  return allowDraft && Array.isArray(o.dice) && o.dice.length === 3 &&
    o.dice.every(n => Number.isInteger(n) && n >= 0 && n <= 6);
}
export function blankOpening() {
  return {names: ['', '', '', ''], seats: [0,1,2,3], dealer: 0, dice: [0,0,0]};
}
export function playerAt(o, seat) {
  const index = o.seats[seat];
  return o.names[index].trim() || '玩家' + (index + 1);
}
export function randomIndex(size) {
  const byte = new Uint8Array(1), limit = 256 - 256 % size;
  do { crypto.getRandomValues(byte); } while (byte[0] >= limit);
  return byte[0] % size;
}
export const rollDice = () => Array.from({length:3}, () => randomIndex(6) + 1);
export function shuffledSeats() {
  const seats = [0,1,2,3];
  for (let i = 3; i > 0; i--) {
    const j = randomIndex(i + 1);
    [seats[i], seats[j]] = [seats[j], seats[i]];
  }
  return seats;
}
export function breakWall(dice, dealer = 0) {
  if (!validDice(dice) || !seatIndex(dealer)) return null;
  const sum = dice.reduce((a,b) => a+b, 0);
  const wall = (dealer + sum - 1) % 4;
  // Facing the wall: skip from the right. At the corner the wall belongs to its owner's left-hand neighbour.
  const take = offset => ({seat:(wall + 4 - Math.floor(offset / 18)) % 4, stack:offset % 18 + 1});
  return {sum, wall, first:take(sum), second:take(sum + 1)};
}
export function diceEffects(dice, rules) {
  const effects = {lines:[], notes:[], factor:1, triple:false};
  if (!validDice(dice)) return effects;
  const [a,b,c] = [...dice].sort((x,y) => x-y);
  const triple = rules.diceTriple && a === c;
  if (rules.diceRun && a+1 === b && b+1 === c)
    effects.lines.push({name:'骰子順子', tai:rules.runTai});
  if (rules.diceRed && dice.every(n => n === 1 || n === 4)) {
    if (triple && !rules.diceStack) effects.notes.push({name:'全紅', why:'與豹子重疊，本桌採豹子優先'});
    else effects.lines.push({name:'骰子全紅', tai:rules.redTai});
  }
  if (triple) {
    effects.triple = true;
    if (rules.tripleMode === 'fixed') effects.lines.push({name:'骰子豹子', tai:rules.tripleTai});
    else effects.factor = rules.tripleMode === 'treble' ? 3 : 2;
  }
  return effects;
}
export function roundResult(picks, mode, role, streak, rules, dice) {
  const base = score(picks,mode,rules);
  const fx = diceEffects(dice,rules);
  let factor = fx.factor, lines = fx.lines, notes = [...base.notes, ...fx.notes];
  const fixedFlower = base.lines.some(l => l.name === '八仙過海' || l.name === '七搶一');
  if (fixedFlower || mode === 'draw' || mode === 'neutral') {
    if (lines.length || factor > 1) notes.push({name:'骰規',why:fixedFlower?'本桌花胡固定八台，骰規不加台或翻倍':'本局無收付，骰規不計'});
    factor = 1; lines = [];
  }
  const before = base.tai + lines.reduce((n,x) => n+x.tai,0);
  const paid = settle(before,mode,role,streak,rules);
  const result = {...base,...paid,lines:[...base.lines,...lines],notes,tai:before,factor};
  if (factor === 1) return result;
  result.lines.push({name:'豹子 ×'+factor+'（胡牌台增額）',tai:before*(factor-1)});
  result.tai *= factor;
  result.dealerTai *= factor;
  result.rows = paid.rows.map(row => ({...row,tai:row.tai*factor,extra:row.extra*factor,each:rules.base+rules.unit*row.tai*factor}));
  const amount = result.rows.reduce((n,x)=>n+x.n*x.each,0);
  result.amount = ['pay','loss'].includes(mode) ? -amount : amount;
  return result;
}
