// 2026-07-24 : office-company 단위 테스트

import { describe, it, expect } from "vitest";
import {
  createCompany,
  tickCompany,
  recordTaskCompletion,
  formatMoney,
  reputationStars,
} from "./office-company";

describe("createCompany", () => {
  it("초기 자금이 100,000이어야 한다", () => {
    const c = createCompany();
    expect(c.money).toBe(100_000);
  });

  it("초기 평판이 50이어야 한다", () => {
    expect(createCompany().reputation).toBe(50);
  });

  it("초기 완료 태스크 수가 0이어야 한다", () => {
    expect(createCompany().totalTasksCompleted).toBe(0);
  });
});

describe("tickCompany", () => {
  it("직원 5명일 때 지출이 50이어야 한다", () => {
    const c = createCompany();
    const next = tickCompany(c, 5);
    expect(next.expenses).toBe(50);
  });

  it("수익 500, 지출 350(35명)이면 자금이 150 늘어야 한다", () => {
    const c = createCompany();
    const next = tickCompany(c, 35);
    expect(next.money).toBe(c.money + c.revenue - 350);
  });

  it("원본 stats를 변경하지 않아야 한다 (불변성)", () => {
    const c = createCompany();
    const moneyBefore = c.money;
    tickCompany(c, 10);
    expect(c.money).toBe(moneyBefore);
  });
});

describe("recordTaskCompletion", () => {
  it("완료 건수가 1 증가해야 한다", () => {
    const c = createCompany();
    expect(recordTaskCompletion(c).totalTasksCompleted).toBe(1);
  });

  it("10건 완료 시 평판이 1 상승해야 한다", () => {
    let c = createCompany();
    for (let i = 0; i < 10; i++) c = recordTaskCompletion(c);
    expect(c.reputation).toBe(51);
  });

  it("평판이 100을 초과하지 않아야 한다", () => {
    let c = { ...createCompany(), reputation: 100 };
    for (let i = 0; i < 10; i++) c = recordTaskCompletion(c);
    expect(c.reputation).toBe(100);
  });
});

describe("formatMoney", () => {
  it("1,000,000 이상은 M 표시", () => {
    expect(formatMoney(1_500_000)).toBe("1.5M");
  });

  it("1,000 이상은 K 표시", () => {
    expect(formatMoney(100_000)).toBe("100K");
  });

  it("1,000 미만은 숫자 그대로", () => {
    expect(formatMoney(500)).toBe("500");
  });
});

describe("reputationStars", () => {
  it("평판 0이면 별 0개", () => {
    expect(reputationStars(0)).toBe(0);
  });

  it("평판 100이면 별 5개", () => {
    expect(reputationStars(100)).toBe(5);
  });

  it("평판 60이면 별 3개", () => {
    expect(reputationStars(60)).toBe(3);
  });
});
