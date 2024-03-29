//
// Model
//

type State = {
  readonly currentProblem: Problem | null;
  readonly currentAnswer: number | null;
  readonly answers: readonly Answer[];
  readonly activeProblems: ActiveProblems;
};

type Problem = {
  readonly startTime: number;
  readonly a: number;
  readonly b: number;
};

type ActiveProblems = {
  readonly as: readonly boolean[];
  readonly bs: readonly boolean[];
};

type Answer = Problem & {
  readonly answer: number;
  readonly answerTime: number;
};

const initialState: State = {
  currentProblem: null,
  currentAnswer: null,
  answers: JSON.parse(window.localStorage.getItem("answers") ?? "[]") as Answer[],
  activeProblems: {
    as: [false, true, true, true, true, true, true, true, true, true, true],
    bs: [false, true, true, true, true, true, true, true, true, true, true],
  },
};

//
// Actions
//
// class Model implements State {
//   readonly currentProblem!: Problem | null;
//   readonly currentAnswer!: number | null;
//   readonly activeProblems!: {
//     as: boolean[];
//     bs: boolean[];
//   };
//   readonly answers!: Answer[];
//   private constructor(newState: Partial<State>, oldState: State = initialState) {
//     Object.assign(this, oldState ?? initialState, newState);
//   }

//   private with(patch: Partial<State>) {
//     return new Model(patch, this);
//   }

//   loadAnswersFromLocalStorage() {
//     return this.with({
//       answers: JSON.parse(window.localStorage.getItem("answers") ?? "[]"),
//     });
//   }

//   ["problem/start"](a: number, b: number, startTime: number) {
//     return this.with({
//       currentProblem: { a, b, startTime },
//     });
//   }
// }

// const Actions2 = {
//   ["problem/start"](a: number, b: number, startTime: number) {
//     return (state: State): State => ({
//       ...state,
//       currentProblem: { a, b, startTime },
//     });
//   },
//   ["answer/update"](answer: number) {
//     return (state: State): State => ({
//       ...state,
//       currentAnswer: answer,
//     });
//   },
// };

type Action =
  | { type: "problem/start"; a: number; b: number; startTime: number }
  | { type: "activeProblems/toggle/a"; a: number }
  | { type: "activeProblems/toggle/b"; b: number }
  | { type: "answer/update"; answer: number | null }
  | { type: "answer/confirm"; answerTime: number }
  | { type: "history/clear" };

const updateState =
  (action: Action) =>
  (state: State): State => {
    switch (action.type) {
      case "problem/start":
        return {
          ...state,
          currentProblem: {
            a: action.a,
            b: action.b,
            startTime: action.startTime,
          },
        };
      case "activeProblems/toggle/a":
        return {
          ...state,
          activeProblems: {
            ...state.activeProblems,
            as: state.activeProblems.as.map((isEnabled, problem) => (problem === action.a ? !isEnabled : isEnabled)),
          },
        };
      case "activeProblems/toggle/b":
        return {
          ...state,
          activeProblems: {
            ...state.activeProblems,
            bs: state.activeProblems.bs.map((isEnabled, problem) => (problem === action.b ? !isEnabled : isEnabled)),
          },
        };
      case "answer/update":
        if (state.currentProblem == null) {
          return state;
        }
        return {
          ...state,
          currentAnswer: action.answer,
        };
      case "answer/confirm":
        return state.currentProblem == null || state.currentAnswer == null
          ? state
          : {
              ...state,
              currentProblem: null,
              currentAnswer: null,
              answers: [
                ...state.answers,
                {
                  ...state.currentProblem,
                  answer: state.currentAnswer,
                  answerTime: action.answerTime,
                },
              ],
            };
      case "history/clear":
        return { ...state, answers: [] };
      default:
        const { type }: never = action;
        throw new Error(`Unhandled action: '${type}'`);
    }
  };

// namespace JSX {
//   export type IntrinsicElements = {
//     [K in keyof HTMLElementTagNameMap]: Partial<HTMLElementTagNameMap[K]>;
//   };

//   type Component<P extends object> = (
//     props: P,
//     ...children: Node[]
//   ) => HTMLElement;

//   export function createElement<P extends object,T extends keyof IntrinsicElements>(
//     tag: T | Component<P>,
//     attributes: IntrinsicElements[T] | P,
//     ...children: Node[]
//   ): HTMLElement {
//     if (typeof tag === "function") return tag(attributes, ...children);

//     const element = document.createElement(tag);
//     for(const a in attributes){
//       if(attributes.hasOwnProperty(a)){
//         //element.setAttribute()
//         element[a] = (attributes as HTMLElementTagNameMap[T])[prop];
//       }
//     }
//     for(const child of children){
//       element.appendChild(child);
//     }
//     return element;
//   }
// }

namespace State {
  type SetState<T> = (update: (state: T) => T) => void;

  export type Listener<T> = (next: T, prev?: T) => void;
  export type Signal<T> = (listener: Listener<T>) => void;

  export function create<T>(state: T, eq: (a: T, b: T) => boolean = Object.is): [Signal<T>, SetState<T>] {
    const listeners: Listener<T>[] = [];
    const signal: Signal<T> = listener => {
      listeners.push(listener);
      listener(state);
    };
    const setState: SetState<T> = update => {
      const newState = update(state);
      if (!eq(state, newState)) {
        for (const listener of listeners) {
          listener(newState, state);
        }
        state = newState;
      }
    };
    return [signal, setState];
  }

  const on =
    <T, U>(extract: (state: T) => U, listener: Listener<U>): Listener<T> =>
    (next: T, prev?: T) => {
      const nextValue = extract(next);
      if (prev === undefined) {
        listener(nextValue);
      } else {
        const prevValue = extract(prev);
        if (!Object.is(nextValue, prevValue)) {
          listener(nextValue, prevValue);
        }
      }
    };

  export function map<T, U>(signal: Signal<T>, f: (state: T) => U): Signal<U> {
    return listener => signal(on(f, listener));
  }

  const sequenceEquals = (a: unknown[], b: unknown[]) => {
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) {
        return false;
      }
    }
    return true;
  };
  export function zip<T, U, V>(a: Signal<T>, b: Signal<U>, f: (a: T, b: U) => V): Signal<V> {
    const [signal, setState] = State.create([undefined!, undefined!] as [a: T, b: U], sequenceEquals);
    a(a => setState(s => [a, s[1]!]));
    b(b => setState(s => [s[0]!, b]));
    return map(signal, s => f(...s));
  }
}

namespace Store {
  type Thunk<S, A> = (state: S) => A | undefined;
  type Action<S, A> = Thunk<S, A> | A;
  type Dispatch<S, A> = (action: Action<S, A>) => void;
  type Reducer<S, A> = (action: A) => (state: S) => S;

  export type Store<S, A> = [State.Signal<S>, Dispatch<S, A>];

  const isThunk = <S, A>(action: Action<S, A>): action is Thunk<S, A> => typeof action === "function";

  export function create<S, A>(initialState: S, update: Reducer<S, A>): Store<S, A> {
    const [signal, setState] = State.create(initialState);
    const dispatch: Dispatch<S, A> = action => {
      if (isThunk(action)) {
        setState(s => {
          const nextAction = action(s);
          if (nextAction !== undefined) {
            return update(nextAction)(s);
          } else {
            return s;
          }
        });
      } else {
        setState(update(action));
      }
    };
    return [signal, dispatch];
  }
}

const [appState, dispatch] = Store.create<State, Action>(initialState, updateState);

//appState(s => console.log("appState", s));

const answers = State.map(appState, s => s.answers);

answers(answers => window.localStorage.setItem("answers", JSON.stringify(answers)));

//
// Spaced repetition suggests that long term retention improves with the number of trials between repeated (succesfull) tests
// where trials are attemts to answer a problem.
// Thus bin problems by number of successful answers (since last error?), order each bin by time last answered
// For problems with no answers simply assign a random order
// Then, from the problems with least answers, pick the problem least recently answered
//

// Indices
namespace AnswersByProblemIndex {
  type Index = { [p: string]: Answer[] };
  export const key = (a: number, b: number) => `${a}*${b}`;
  const add = (answer: Answer) => (index: Index) => {
    const p = key(answer.a, answer.b);
    return {
      ...index,
      [p]: [...(index[p] ?? []), answer],
    };
  };
  export function create(answers: State.Signal<readonly Answer[]>) {
    const [subbscribe, update] = State.create<Index>({});

    let indexed = 0;
    answers(answers => {
      for (let i = indexed; i < answers.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        update(add(answers[i]!));
      }
      indexed = answers.length;
    });

    return subbscribe;
  }
}
const answersByProblem = AnswersByProblemIndex.create(answers);

const MAX_DURATION = 10_000;
type Result = {
  readonly a: number;
  readonly b: number;
  readonly isCorrect: boolean[];
  readonly lastAnswerTime: number;
  readonly streak: number;
  readonly duration: number;
};
const results = State.map(answersByProblem, index => {
  const results: Result[] = [];
  for (let a = 1; a < 10; a++) {
    for (let b = 1; b < 10; b++) {
      const c = a * b;
      const p = AnswersByProblemIndex.key(a, b);

      let answers = index[p] ?? [];
      let lastAnswerTime = 0;
      if (answers.length !== 0) {
        // Last 9 answers
        answers.sort((a1, a2) => a2.answerTime - a1.answerTime); //a1-a2 = ascending, a2-a1 = descending;
        answers = answers.slice(0, Math.min(answers.length, 9));
        lastAnswerTime = answers[0]!.answerTime;
        // in ascending order
        answers.reverse();
      }

      const isCorrect: boolean[] = [];
      let streak = 0;
      let duration = MAX_DURATION;
      for (let i = 0; i < 10 && i < answers.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const answer = answers[i]!;
        if (answer.answer === c) {
          isCorrect[i] = true;
          streak++;
          duration = Math.min(duration, answer.answerTime - answer.startTime);
        } else {
          isCorrect[i] = false;
          streak = 0;
          duration = MAX_DURATION;
        }
      }
      results.push({ a, b, isCorrect, lastAnswerTime, streak, duration });
    }
  }
  results.sort((p1, p2) => {
    const byCorrectAnswersAscending = p1.streak - p2.streak;
    if (byCorrectAnswersAscending !== 0) {
      return byCorrectAnswersAscending;
    }
    const byLastAnswerTimeAscending = p1.lastAnswerTime - p2.lastAnswerTime;
    if (byLastAnswerTimeAscending !== 0) {
      return byLastAnswerTimeAscending;
    }
    return Math.random() - 0.5;
  });
  return results as readonly Result[];
});

// When answer is posted, trigger next problem
results(p => {
  setTimeout(() => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    dispatch(state => {
      const { as, bs } = state.activeProblems;
      for (let { a, b } of p) {
        if (as[a] && bs[b]) {
          return {
            type: "problem/start",
            a,
            b,
            startTime: Date.now(),
          };
        }
      }
      return undefined;
    });
  }, 0);
});

//
// Views
//
function createProblemView([appState, dispatch]: Store.Store<State, Action>): HTMLElement {
  const root = document.createElement("div");
  root.className = "problem";

  const currentProblem = State.map(appState, s => s.currentProblem);
  const currentAnswer = State.map(appState, s => s.currentAnswer);

  root.appendChild(createExpression(currentProblem, currentAnswer));

  root.appendChild(
    createKeypad({
      onDigit(digit) {
        dispatch(state => {
          const currentAnswer = state.currentAnswer;
          if (currentAnswer === null) {
            return {
              type: "answer/update",
              answer: Number(digit),
            };
          } else {
            return {
              type: "answer/update",
              answer: Number(String(currentAnswer) + digit),
            };
          }
        });
      },
      onErase() {
        dispatch(state => {
          const answer = state.currentAnswer;
          if (answer === null) {
            return undefined;
          }
          const answerString = String(answer);
          if (answerString.length == 1) {
            return { type: "answer/update", answer: null };
          } else {
            const newAnswer = Number(answerString.substring(0, answerString.length - 1));
            return { type: "answer/update", answer: newAnswer };
          }
        });
      },
      onConfirm() {
        dispatch({ type: "answer/confirm", answerTime: Date.now() });
      },
    })
  );

  return root;

  function createExpression(problem: State.Signal<Problem | null>, answer: State.Signal<number | null>) {
    const root = document.createElement("div");
    root.className = "expression row justify-content-center";
    root.innerHTML = `
      <div class="lhs"></div>
      <div class="rhs"></div>
    `;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const lhs = root.querySelector(".lhs")!;
    problem(p => (lhs.innerHTML = p != null ? `${p.a} × ${p.b} =&nbsp;` : ""));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rhs = root.querySelector(".rhs")!;
    answer(a => (rhs.innerHTML = a != null ? String(a) : ""));
    return root;
  }

  function createKeypad(props: { onDigit(digit: string): void; onErase(): void; onConfirm(): void }) {
    const root = document.createElement("table");
    root.className = "keypad";
    root.innerHTML = `
      <tr><td><button>1</button></td><td><button>2</button></td><td><button>3</button></td></tr>
      <tr><td><button>4</button></td><td><button>5</button></td><td><button>6</button></td></tr>
      <tr><td><button>7</button></td><td><button>8</button></td><td><button>9</button></td></tr>
      <tr><td><button>✓</button></td><td><button>0</button></td><td><button>⌫</button></td></tr>
    `;
    const buttons = root.querySelectorAll("button");
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i]!;

      button.addEventListener("click", ev => {
        const btn = ev.target as HTMLButtonElement;
        const txt = btn.innerHTML;
        switch (txt) {
          case "0":
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9":
            props.onDigit(btn.innerHTML);
            break;
          case "⌫":
            props.onErase();
            break;
          case "✓":
            props.onConfirm();
            break;
          default:
        }
      });
    }
    return root;
  }
}

type ResultViewModel = {
  readonly activeProblems: ActiveProblems;
  readonly results: readonly Result[];
};

function createResultView(width: number, height: number, vm: State.Signal<ResultViewModel>) {
  const results = State.map(vm, s => s.results);
  const activeProblems = State.map(vm, s => s.activeProblems);

  const table = document.createElement("table");
  table.className = "result-view";

  table.appendChild(createHeaderRow());
  for (let row = 1; row < height; row++) {
    table.appendChild(createBodyRow(row));
  }
  return table;

  function createHeaderRow() {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.innerText = "×";
    tr.appendChild(th);
    for (let col = 1; col < width; col++) {
      const th = document.createElement("th");
      th.innerHTML = String(col);
      th.addEventListener("click", () => {
        dispatch({ type: "activeProblems/toggle/b", b: col });
      });
      activeProblems(ps => {
        th.className = ps.bs[col] ? "enabled" : "disabled";
      });
      tr.appendChild(th);
    }
    return tr;
  }

  function createBodyRow(row: number) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.innerHTML = String(row);
    th.addEventListener("click", () => {
      dispatch({ type: "activeProblems/toggle/a", a: row });
    });
    activeProblems(ps => {
      th.className = ps.as[row] ? "enabled" : "disabled";
    });
    tr.appendChild(th);
    for (let col = 1; col < width; col++) {
      const td = document.createElement("td");
      const signal = State.map(results, problems => {
        for (const p of problems) {
          if (p.a === row && p.b == col) {
            const score = 1 - p.duration / MAX_DURATION;
            return {
              innerHTML: p.isCorrect.map(correct => (correct ? "🟢" : "🔴")).join("&ZeroWidthSpace;"),
              style: {
                backgroundColor: `hsl(0, 0%, ${score * 100}%)`,
              },
            };
          }
        }
        return { innerHTML: "", style: { backgroundColor: "transparent" } };
      });
      signal(s => {
        td.innerHTML = s.innerHTML;
        td.style.backgroundColor = s.style.backgroundColor;
      });
      tr.appendChild(td);
    }
    return tr;
  }
}

const lContent = document.createElement("div");
lContent.className = "col";
lContent.appendChild(createProblemView([appState, dispatch]));

const rContent = document.createElement("div");
rContent.className = "col align-items-center justify-content-center";

const activeProblems = State.map(appState, f => f.activeProblems);
const resultViewVM = State.zip(activeProblems, results, (activeProblems, results) => ({ activeProblems, results }));
rContent.appendChild(createResultView(10, 10, resultViewVM));

const contentElement = document.body;
contentElement.className = "container";
contentElement.appendChild(lContent);
contentElement.appendChild(rContent);
