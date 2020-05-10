import * as React from 'react';
import { hot } from 'react-hot-loader/root';
import * as fs from 'fs';

const { useState, useEffect, createContext, useContext } = React;
const carriageIcon = `data:image/png;base64,${fs
    .readFileSync('assets/carriage.png')
    .toString('base64')}`;

type Size = { HEIGHT: number; WIDTH: number };
enum Rails {
    FIRST = 200,
    SECOND = 400
}
enum Depos {
    LEFT = 1050,
    RIGHT = 150
}

const WINDOW: Size = { HEIGHT: 700, WIDTH: 1200 };
const CARRIAGE: Size = { HEIGHT: 40, WIDTH: 70 };
const STATION: Size = { HEIGHT: 350, WIDTH: 65 };
const RAIL: Size = { HEIGHT: 20, WIDTH: Depos.LEFT - Depos.RIGHT };

const ANIMATION_TIME = 50;
const STEP = 5;

const STATIONS_COUNT = 5;
const ROAD_LENGTH = (Depos.LEFT - Depos.RIGHT) / (STATIONS_COUNT + 1);
const STATIONS = Array(STATIONS_COUNT)
    .fill(Depos.RIGHT + ROAD_LENGTH)
    .map((rPos, index) => rPos + index * ROAD_LENGTH);
const TOP_STATION = 300;

const STATION_DURATION = 2000;
const STATION_TICKS = STATION_DURATION / ANIMATION_TIME;

const STATION_STYLE: React.CSSProperties = {
    top: TOP_STATION,
    height: STATION.HEIGHT,
    width: STATION.WIDTH,
    zIndex: 1,
    backgroundColor: '#a0a1a1',
    position: 'absolute',
    marginLeft: `-${STATION.WIDTH / 2}px`,
    marginTop: `-${STATION.HEIGHT / 2}px`
};

const CARRIAGE_STYLE: React.CSSProperties = {
    height: CARRIAGE.HEIGHT,
    width: CARRIAGE.WIDTH,
    zIndex: 3,
    position: 'absolute',
    marginLeft: `-${CARRIAGE.WIDTH / 2}px`,
    marginTop: `-${CARRIAGE.HEIGHT / 2}px`
};

const DEPO_STYLE: React.CSSProperties = {
    height: STATION.HEIGHT,
    width: 10,
    top: TOP_STATION,
    zIndex: 4,
    position: 'absolute',
    marginLeft: `-5px`,
    marginTop: `-${STATION.HEIGHT / 2}px`,
    backgroundColor: 'red'
};

const RAIL_STYLE: React.CSSProperties = {
    height: RAIL.HEIGHT,
    width: RAIL.WIDTH,
    right: Depos.RIGHT,
    zIndex: 2,
    position: 'absolute',
    marginLeft: `-${RAIL.WIDTH / 2}px`,
    marginTop: `-${RAIL.HEIGHT / 2}px`,
    border: '5px solid black'
};

type State = {
    isMining: boolean;
    isFellOnTrack: boolean;
    brokenCarriageNumber: number | undefined;
};
const initiatState: State = {
    isMining: false,
    isFellOnTrack: false,
    brokenCarriageNumber: undefined
};
const MetroContext = createContext<State>(initiatState);

type CarriageState = {
    top: Rails;
    right: number;
    timer: NodeJS.Timer | null;
    duration: number;
};
type CarriagePisition = { top: number; right: number };
type UseCarriage = (number: number, rail: Rails, context: State) => [CarriagePisition, 1 | -1];

const useCarriage: UseCarriage = (number, rail, context) => {
    const { isMining, isFellOnTrack, brokenCarriageNumber } = context;
    const direction = rail === Rails.FIRST ? 1 : -1;
    const initRight = direction === 1 ? Depos.RIGHT : Depos.LEFT;
    const intialState: CarriageState = { top: rail, right: initRight, duration: 0, timer: null };
    const [state, setState] = useState<CarriageState>(intialState);
    const animationStep = () => {
        setState((prevState: CarriageState) => {
            const absoluteRight = prevState.right + CARRIAGE.WIDTH / 2;
            const isStation =
                prevState.duration === STATION_TICKS
                    ? false
                    : prevState.duration > 0 || STATIONS.includes(absoluteRight);
            const duration = isStation ? prevState.duration + 1 : 0;
            const right: number =
                (direction === 1 && absoluteRight === Depos.LEFT && Depos.RIGHT) ||
                (direction === -1 && absoluteRight === Depos.RIGHT && Depos.LEFT) ||
                prevState.right + (isStation ? 0 : direction * STEP);
            return { ...prevState, right, duration };
        });
    };

    useEffect(() => {
        const intervalTimer = setInterval(animationStep, ANIMATION_TIME);
        setState(prevState => ({ ...prevState, timer: intervalTimer }));
        return () => (state.timer ? clearInterval(state.timer) : undefined);
    }, []);

    return [state, direction];
};

type CarriageProps = { startPosition: number; number: number };
const Carriage = ({ startPosition, number }: CarriageProps) => {
    const metroContext = useContext(MetroContext);
    const [position, direction] = useCarriage(number, startPosition, metroContext);
    const { brokenCarriageNumber } = metroContext;

    return (
        <img
            style={{
                ...CARRIAGE_STYLE,
                ...position,
                transform: `scaleX(${-direction})`,
                border: brokenCarriageNumber === number ? '2px solid red' : ''
            }}
            src={carriageIcon}
            alt="carriage"
            />
    );
};

type Carriage = {
    rail: Rails;
    number: number;
    right: number;
};

const Application = () => {
    const [isMining, setIsMining] = useState<boolean>(false);
    const [isFellOnTrack, setIsFellOnTrach] = useState<boolean>(false);
    const [brokenCarriageNumber, setBrokernCarriageNumber] = useState<number | undefined>(
        undefined
    );
    const [firstRail, setFirstRailCarriages] = useState<Array<Carriage>>([]);
    const [secondRail, setSecondRailCarriages] = useState<Array<Carriage>>([]);

    return (
        <MetroContext.Provider value={{ isMining, isFellOnTrack, brokenCarriageNumber }}>
            {STATIONS.map(left => (
                <div key={left} style={{ ...STATION_STYLE, left }} />
            ))}
            <Carriage startPosition={Rails.FIRST} number={1} />
            <Carriage startPosition={Rails.SECOND} number={2} />
            <div style={{ ...RAIL_STYLE, top: Rails.FIRST }} />
            <div style={{ ...RAIL_STYLE, top: Rails.SECOND }} />
            <div style={{ ...DEPO_STYLE, right: Depos.RIGHT }} />
            <div style={{ ...DEPO_STYLE, right: Depos.LEFT }} />
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 300,
                    backgroundColor: 'yellow'
                }}>
                <button onClick={() => setIsMining(prevState => !prevState)}>mining</button>
                <button onClick={() => setIsFellOnTrach(prevState => !prevState)}>
                    felled man
                </button>
                <button
                    onClick={() =>
                        setBrokernCarriageNumber(prevState => (prevState ? 1 : undefined))
                    }>
                    random brokern carriage
                </button>
            </div>
        </MetroContext.Provider>
    );
};

export default hot(Application);
