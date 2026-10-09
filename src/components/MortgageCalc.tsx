"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");

export function MortgageCalc({ price: initial = 9_500_000 }: { price?: number }) {
  const [price, setPrice] = useState(initial);
  const [down, setDown] = useState(20);
  const [rate, setRate] = useState(6);
  const [years, setYears] = useState(25);

  const loan = price * (1 - down / 100);
  const r = rate / 100 / 12;
  const n = years * 12;
  const monthly = r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));

  return (
    <div className="calc">
      <div style={{ display: "grid", gap: 22 }}>
        <div className="calc__row">
          <label>
            Стоимость дома <b>{formatPrice(price)}</b>
          </label>
          <input aria-label="Стоимость дома" type="range" min={5_000_000} max={20_000_000} step={100_000} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
        <div className="calc__row">
          <label>
            Первый взнос <b>{down}% · {fmt((price * down) / 100)} ₽</b>
          </label>
          <input aria-label="Первый взнос, %" type="range" min={20} max={80} step={1} value={down} onChange={(e) => setDown(Number(e.target.value))} />
        </div>
        <div className="calc__row">
          <label>
            Ставка <b>{rate.toLocaleString("ru-RU")}%</b>
          </label>
          <input aria-label="Ставка, %" type="range" min={2} max={25} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        </div>
        <div className="calc__row">
          <label>
            Срок <b>{years} лет</b>
          </label>
          <input aria-label="Срок, лет" type="range" min={5} max={30} step={1} value={years} onChange={(e) => setYears(Number(e.target.value))} />
        </div>
      </div>
      <div className="calc__result">
        <small>Ежемесячный платёж</small>
        <b>{fmt(monthly)} ₽</b>
        <small>Сумма кредита {fmt(loan)} ₽ · рекомендуемый доход семьи от {fmt(monthly * 2)} ₽/мес</small>
        <a href="#lead" className="btn btn--gold" style={{ marginTop: 8 }}>
          Получить точный расчёт
        </a>
        <small>
          Расчёт ориентировочный. Ставку, первый взнос и одобрение определяет банк-кредитор — менеджер подберёт программу под вашу
          ситуацию.
        </small>
      </div>
    </div>
  );
}
