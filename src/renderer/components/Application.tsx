import * as React from 'react';
import { hot } from 'react-hot-loader/root';
import * as fs from 'fs';
import * as path from 'path';
import { remote } from 'electron';

const { useState, useEffect, useRef } = React

const uploadIcon = (filePath: string): string =>
  `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`

const carriageIcon = uploadIcon('assets/carriage.png')
const openCarriageIcon = uploadIcon('assets/open-carriage.png')

type Size = { HEIGHT: number, WIDTH: number }
enum Rails { FIRST = 200, SECOND = 400 }
enum Depos { LEFT = 1050, RIGHT = 150 }

const WINDOW: Size = { HEIGHT: 700, WIDTH: 1200 }
const CARRIAGE: Size = { HEIGHT: 40, WIDTH: 70 }
const STATION: Size = { HEIGHT: 350, WIDTH: 65 }
const RAIL: Size = { HEIGHT: 20, WIDTH: Depos.LEFT - Depos.RIGHT }
const TOP_STATION = 300;

const ANIMATION_TIME = 50;
const STEP = 5;

const STATION_DURATION = 2000
const STATION_TICKS = STATION_DURATION / ANIMATION_TIME
const STATIONS_COUNT = 5
const ROAD_LENGTH = (Depos.LEFT - Depos.RIGHT) / (STATIONS_COUNT + 1)
const STATIONS = Array(STATIONS_COUNT).fill(Depos.RIGHT + ROAD_LENGTH)
  .map((rPos, index) => rPos + index * ROAD_LENGTH);
const NEW_CARRIAGE_INTERVAL = STATIONS[1] - STATIONS[0] + 10;

const RAIL_STYLE: React.CSSProperties = {
  height: RAIL.HEIGHT,
  width: RAIL.WIDTH,
  right: Depos.RIGHT,
  zIndex: 1,
  position: 'absolute',
  marginLeft: `-${RAIL.WIDTH / 2}px`,
  marginTop: `-${RAIL.HEIGHT / 2}px`,
  border: '5px solid black'
}

const STATION_STYLE: React.CSSProperties = {
  top: TOP_STATION,
  height: STATION.HEIGHT,
  width: STATION.WIDTH,
  zIndex: 2,
  backgroundColor: '#a0a1a1',
  position: 'absolute',
  marginLeft: `-${STATION.WIDTH / 2}px`,
  marginTop: `-${STATION.HEIGHT / 2}px`,
}

const CARRIAGE_STYLE: React.CSSProperties = {
  height: CARRIAGE.HEIGHT,
  width: CARRIAGE.WIDTH,
  zIndex: 3,
  position: 'absolute',
  marginLeft: `-${CARRIAGE.WIDTH / 2}px`,
  marginTop: `-${CARRIAGE.HEIGHT / 2}px`,
}

const DEPO_STYLE: React.CSSProperties = {
  height: STATION.HEIGHT,
  width: 10,
  top: TOP_STATION,
  zIndex: 4,
  position: 'absolute',
  marginLeft: `-5px`,
  marginTop: `-${STATION.HEIGHT / 2}px`,
  backgroundColor: 'red'
}

const TOOLBAR_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: 300,
  height: 50,
  backgroundColor: 'yellow',
  display: 'flex'
}

type TCarriage = {
  right: number,
  rail: Rails,
  number: number,
  duration: number;
  isBroken: boolean;
  isOpenedDoor: boolean;
}

const Carriage = ({ rail, number, right, isBroken, isOpenedDoor }: TCarriage) => {
  const direction = rail === Rails.FIRST ? 1 : -1;
  const style = { ...CARRIAGE_STYLE, top: rail, right}
  return (
    <>
      <p
        style={{
          ...style,
          zIndex: 5,
          right: style.right - (direction === 1 ? 0 : CARRIAGE.WIDTH - 8)
        }}>
          {number}
        </p>
      <img
        style={{
          ...style,
          transform: `scaleX(${-direction})`,
          border: isBroken ? '2px solid red' : ''
        }}
        src={isOpenedDoor ? openCarriageIcon : carriageIcon}
        alt="carriage"
        />
    </>
  );
}

const getCarriageNumber = (carriages: TCarriage[]): number => Math.max(...carriages.map(c => c.number)) + 1
const checkIfInDepo = (carriage: TCarriage) => (
  carriage && (
    (carriage.rail === Rails.FIRST && carriage.right === (Depos.LEFT - CARRIAGE.WIDTH)) ||
    (carriage.rail === Rails.SECOND && carriage.right === Depos.RIGHT)
  ))

const initialCarriages = [
  { rail: Rails.FIRST, number: 1, right: Depos.RIGHT + CARRIAGE.WIDTH / 2 , duration: 0, isBroken: false, isOpenedDoor: false },
  { rail: Rails.SECOND, number: 2, right: Depos.LEFT - CARRIAGE.WIDTH / 2, duration: 0, isBroken: false, isOpenedDoor: false }
]

const insertCarriageOnFirstRail = (carriages: TCarriage[]): [TCarriage[], number] => {
  const carriageNumber = getCarriageNumber(carriages)
  return [[ ...carriages, {
    rail: Rails.FIRST,
    number: carriageNumber,
    right: Depos.RIGHT + CARRIAGE.WIDTH / 2,
    duration: 0,
    isBroken: false,
    isOpenedDoor: false,
  }], carriageNumber]
}

const insertCarriageOnSecondRail = (carriages: TCarriage[]): [TCarriage[], number] => {
  const carriageNumber = getCarriageNumber(carriages)
  return [[ ...carriages, {
    rail: Rails.SECOND,
    number: carriageNumber,
    right: Depos.LEFT - CARRIAGE.WIDTH / 2,
    duration: 0,
    isBroken: false,
    isOpenedDoor: false,
  }], carriageNumber]
}


const useFsSystem = () => {
  const writeStreamRef = useRef<fs.WriteStream | undefined>();

  const write = (string: string) => {
    const date = new Date().toISOString();
    const line = `${date}\t${string}`;
    const out = `${line.replace(/[\n\r]\s*/g, '; ')}\n`;
    if (writeStreamRef.current) writeStreamRef.current.write(out);
  }

  useEffect(() => {
    const [directoryName] = remote.dialog.showOpenDialog({ properties: ['openDirectory'] });
    const absoluetPath = path.join(directoryName, 'log.log');
    if (!fs.existsSync(absoluetPath)) fs.writeFileSync(absoluetPath, '');
    const writeStream: fs.WriteStream = fs.createWriteStream(absoluetPath, { flags: 'a' });
    writeStreamRef.current = writeStream
    return () => writeStreamRef.current && writeStreamRef.current.close();
  }, []);

  return write
}

const Application = () => {
  const write = useFsSystem();
  const [isMining, setIsMining] = useState<boolean>(false);
  const [falledManRail, setFalledManRail] = useState<number | undefined>(undefined);
  const [rails, setRailCarriages] = useState<TCarriage[]>(initialCarriages);

  const animationStep = () => {
    setIsMining(isMine => {
      setFalledManRail(falledRail => {
        setRailCarriages(carriages => {
          const brokenCarriage = carriages.find(c => c.isBroken);
          if (brokenCarriage && checkIfInDepo(brokenCarriage)) {
            write(`Broken carriage with ${brokenCarriage.number} number arrived on depo`);
            return carriages.filter(c => c.number !== brokenCarriage.number);
          }
          if (isMine) {
            const hiddenCarriagesNubers = carriages.filter(checkIfInDepo).map(c => c.number)
            if (hiddenCarriagesNubers.length > 0) {
              write(`Carriages with ${hiddenCarriagesNubers.join(', ')} numbers arrived on depo cause mining`);
              return carriages.filter(c => !hiddenCarriagesNubers.includes(c.number))
            }
          }
          if (!isMine && carriages.length === 0) {
            write(`Carriages with numbers ${initialCarriages.map(c => c.number).join(', ')} start`)
            return initialCarriages
          }
          if (!isMine) {
            const firstRailCarriages = carriages.filter(c => c.rail === Rails.FIRST)
            if (firstRailCarriages.length === 0) {
              const [newCarriages, carriageNumber] = insertCarriageOnFirstRail(carriages);
              write(`Carriage with number ${carriageNumber} starts`)
              return newCarriages;
            }
            const lastFirstRailCarriages = firstRailCarriages.reduce(
              (last, current) => current.number > last.number ? current : last,
              firstRailCarriages[0]
            )
            if (
              lastFirstRailCarriages.right - Depos.RIGHT > NEW_CARRIAGE_INTERVAL && 
              firstRailCarriages.length < STATIONS.length
            ) {
              const [newCarriages, carriageNumber] = insertCarriageOnFirstRail(carriages);
              write(`Carriage with number ${carriageNumber} starts`)
              return newCarriages;
            }
            const secondRailCarriages = carriages.filter(c => c.rail === Rails.SECOND)
            if (secondRailCarriages.length === 0) {
              const [newCarriages, carriageNumber] = insertCarriageOnSecondRail(carriages);
              write(`Carriage with number ${carriageNumber} starts`)
              return newCarriages;
            }
            const lastSecondRailCarriages = secondRailCarriages.reduce(
              (last, current) => current.number > last.number ? current : last,
              secondRailCarriages[0]
            )
            if (
              Depos.LEFT - lastSecondRailCarriages.right - CARRIAGE.WIDTH / 2 > NEW_CARRIAGE_INTERVAL && 
              secondRailCarriages.length < STATIONS.length
            ) {
              const [newCarriages, carriageNumber] = insertCarriageOnSecondRail(carriages);
              write(`Carriage with number ${carriageNumber} starts`)
              return newCarriages;
            }
          }
          return carriages.map(carriage => {
            if (carriage.rail === falledRail) return carriage
            const direction = carriage.rail === Rails.FIRST ? 1 : -1;
            let isStation = !isMine;
            if (isStation) {
              isStation = carriage.duration === STATION_TICKS
                ? false
                : (carriage.duration > 0 || STATIONS.includes(carriage.right + CARRIAGE.WIDTH / 2));
            }
            const duration = isStation ? carriage.duration + 1 : 0;
            const right: number =
              (direction === 1 && carriage.right === (Depos.LEFT - CARRIAGE.WIDTH) && Depos.RIGHT + CARRIAGE.WIDTH / 2) ||
              (direction === -1 && carriage.right === Depos.RIGHT && Depos.LEFT - CARRIAGE.WIDTH / 2) ||
              carriage.right + (isStation ? 0 : (direction * STEP));
            const isOpenedDoor = isStation && !carriage.isBroken && !isMine
            return { ...carriage, right, duration, isOpenedDoor }
          })
        })
        return falledRail
      })
      return isMine
    })
  }
  
  const brokeSomeCarriage = () => {
    setRailCarriages(carriages => {
      if (carriages.some(c => c.isBroken)) {
        write(`All carriages were fixed`)
        return carriages.map(c => ({ ...c, isBroken: false }))
      }
      const brokenNumber = rails[Math.floor(Math.random() * rails.length)].number
      write(`Carriage with number ${brokenNumber} was broken`)
      return carriages.map(c => ({ ...c, isBroken: c.number === brokenNumber }))
    })
  }

  const fellManOnSomeRail = () => {
    setFalledManRail(rail => {
      if (rail === undefined) {
        const allRails = [200, 400];
        const randomRail = allRails[Math.floor(Math.random() * allRails.length)];
        write(`Men falled on ${randomRail === 200 ? 'first' : 'second'} rail`)
        return randomRail
      }
      write(`Men was clened from ${rail === 200 ? 'first' : 'second'} rail`)
      return undefined
    })
  }

  useEffect(() => {
    const intervalTimer = setInterval(animationStep, ANIMATION_TIME);
    return () => clearInterval(intervalTimer);
  }, [])

  const brokenRail = falledManRail
    ? (falledManRail === Rails.FIRST && 'first') || (falledManRail === Rails.SECOND && 'second')
    : '-'
  return (
    <>
      <pre>Broken number: {rails.find(c => c.isBroken)?.number || '-'}</pre>
      <pre>Man fell on {brokenRail} rail</pre>
      <pre>Message: {isMining ? 'MINIG' : '-'}</pre>
      {STATIONS.map(left => <div key={left} style={{ ...STATION_STYLE, left }} />)}
      {rails.map(carriage => <Carriage {...carriage} key={carriage.number} />)}
      <div style={{ ...RAIL_STYLE, top: Rails.FIRST, backgroundColor: falledManRail === Rails.FIRST ? 'red' : 'white' }} />
      <div style={{ ...RAIL_STYLE, top: Rails.SECOND, backgroundColor: falledManRail === Rails.SECOND ? 'red' : 'white' }} />
      <div style={{ ...DEPO_STYLE, right: Depos.RIGHT }} />
      <div style={{ ...DEPO_STYLE, right: Depos.LEFT }} />
      <div style={TOOLBAR_STYLE}>
        <button onClick={() => setIsMining(prev => !prev)}>mining</button>
        <button onClick={fellManOnSomeRail}>felled man</button>
        <button onClick={brokeSomeCarriage}>random brokern carriage</button>
      </div>
    </>
  );
}

export default hot(Application);
