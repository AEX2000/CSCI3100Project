import React, { useState, useEffect, useContext, useRef } from 'react';
import {useGameSocket} from '../../contexts/GameSocketProvider'
import { useConversations } from '../../contexts/ConversationsProvider';
import {Modal,Button} from 'react-bootstrap';
import {PageContext} from '../../components/appPage/pageContext'
import './game.css'
import OpenConversation from '../../components/OpenConversation';
import pingSound from './ping.mp3';
import endSound from './end.mp3';

// Please refer to the React Tic Tac Toe tutorial. I might write some comment later.

function Square({value,onSquareClick,xIsNext,playerColor}){
  const [isHovered,setIsHovered] = useState(false);
  let SquaresMap = null

  const handleMouseEnter = ()=>{
    setIsHovered(true);
  }
  const handleMouseLeave = ()=>{
    setIsHovered(false);
  }
  if(playerColor!==xIsNext){
    SquaresMap = {
      null:<button className={`square ${isHovered ? 'hovered' : ''} ${xIsNext ? 'HX':'HO'}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={onSquareClick}></button>,
      "X": <button className="square X" onMouseLeave={handleMouseLeave}></button>,
      "O": <button className="square O" onMouseLeave={handleMouseLeave}></button>,
    }
  }
  else{
    SquaresMap = {
      null:<button className="square" onMouseLeave={handleMouseLeave}></button>,
      "X": <button className="square X" onMouseLeave={handleMouseLeave}></button>,
      "O": <button className="square O" onMouseLeave={handleMouseLeave}></button>,
    }
  } 
  return SquaresMap[value];
}
  
export default function Game({color}){
  // x stands for black and o stands for white
  const socket = useGameSocket()
  const [xIsNext,setXIsNext] = useState(true);
  const [history,setHistory] = useState([Array(361).fill(null)]);
  const [winner,setWinner] = useState(null)
  const {returnToHome} = useContext(PageContext)
  const [hasRetraction,setHasRetraction] = useState(false)
  const [receiveRetraction, setReceiveRetraction] = useState(false)
  const [currentMove,setCurrentMove] = useState(0);
  const currentSquares = history[currentMove];
  const { createConversation, selectConversationIndex, returnConversationIndex } = useConversations()

  useEffect(() => {
    if (socket == null) return

    socket.on('handle-play', (place,player)=>{
      let nextSquares = history[currentMove].slice()
      nextSquares[place] = player? "O":"X"
      setXIsNext(player)
      const nextHistory = [...history.slice(0,currentMove+1),nextSquares];
      setHistory(nextHistory)
      setCurrentMove(nextHistory.length-1)
      setWinner(checkWinner(player, nextSquares, place))
    })

    return () => socket.off('handle-play')
  }, [socket,history,currentMove])

  useEffect(() => {
    if (socket == null) return

    socket.on('create-game-chat', (opponent) =>{
      console.log(opponent)
      createConversation([opponent])
      let conversationIndex = returnConversationIndex(opponent)
      console.log('conversation index: ', conversationIndex)
      selectConversationIndex(conversationIndex)
    })

    return () => socket.off('create-game-chat')
  }, [socket, createConversation, selectConversationIndex, returnConversationIndex])


  function summaryGame(){
    socket.emit('summary-game',winner)
    returnToHome()
  }

  function placeStone(i){
    // xIsNext means black is next, in which player white color=true === xIsNext
    if(currentSquares[i]||color===xIsNext){
      return;
    }
    if (document.getElementById('audio')){
      document.getElementById('audio').play();
    }
    socket.emit('place-stone',i)
  }

  function retractRequest(){
    setHasRetraction(true)
    socket.emit('retract-request')
  }

  useEffect(() => {
    if (socket == null) return

    socket.on('handle-retract-request', ()=>{
      setReceiveRetraction(true)
    })

    return () => socket.off('handle-retract-request')
  }, [socket])

  function confirmRetractionRequest(){
    socket.emit('response-retract-request',true)
  }

  function refuseRetractionRequest(){
    socket.emit('response-retract-request',false)
  }

  useEffect(() => {
    if (socket == null) return

    socket.on('end-retract-request', (message)=>{
      if(message){
        alert("The retraction is confirmed")
        const previousMove = currentMove-2
        setCurrentMove(previousMove)
      }
      else{
        alert("The retraction is refused")
      }
      setHasRetraction(false)
      setReceiveRetraction(false)
    })

    return () => socket.off('end-retract-request')
  }, [socket,history,currentMove])

  let status = 'Current player: ' + (xIsNext ? 'Black':'White');
  return(
    <div className='game'>
      <div className="status">
        {status}
        <Button onClick={retractRequest} disabled={color===xIsNext}>Rectract</Button>
      </div>
      <div className="game-board">
        <Board xIsNext={xIsNext} squares={currentSquares} placeStone={placeStone} playerColor={color}/>
      </div>
      <div className='chat'>
        <OpenConversation/>
      </div>
      <Modal show={winner}>
        <GameEndModal summaryGame={()=>summaryGame(winner)} winner={winner}/>
      </Modal>
      <Modal show={hasRetraction||receiveRetraction}>
        <RetractModal hasRetraction={hasRetraction} receiveRetraction={receiveRetraction} confirmRetractionRequest={confirmRetractionRequest} refuseRetractionRequest={refuseRetractionRequest}/>
      </Modal>
    </div>
  );
}

function Board({xIsNext,squares,placeStone,playerColor}) {

  const rowsArray = [];
  const width =19;
  const height = 19;
  for(let i = 0; i < height; i++){
    const buttonsArray = [];
    for(let j = 0; j < width; j++){
      buttonsArray.push(
        <Square key = {`button-${j}`} value={squares[i*width+j]} onSquareClick={() => placeStone(i*width+j)} xIsNext={xIsNext} playerColor = {playerColor}/>
      )
    }
    rowsArray.push(
      <div className="board-row" key={`row-${i}`}>
        {buttonsArray}
      </div>
    )
  }
  
  return (
    <>
    <audio id="audio"><source src={pingSound} type="audio/mp3"></source></audio>
    <audio id="endAudio"><source src={endSound} type="audio/mp3"></source></audio>
    {rowsArray}
    </>
  );
}

function checkEarlyTermination(squares1D, place) {
	var ld = Math.min(place % 19, 4)
	var rd = Math.min(18 - ld, 4)
	var ud = Math.min(Math.floor(place/19), 4)
	var dd = Math.min(18 - ud, 4)
	
	var startIndex = Math.max(place - ld - ud * 19,0)
	var endIndex = Math.min(place + rd + dd * 19,360)
	console.log("startIndex:", startIndex, "endIndex:", endIndex)
	var placeList = [] // a list of cells that needs to be checked
	
	for (let i = startIndex; i <= endIndex; i++){
		if (i % 19 >= startIndex % 19 && i % 19 <= endIndex % 19){
			placeList.push(i);
		}
	}
	
  const blackstone = "X";

  // Count the number of potential winning moves before the move
  var pwmBefore = 0;
	
	for (const pos in placeList){
		let testSquare = JSON.parse(JSON.stringify(squares1D))
		if (testSquare[pos] !== null) continue;
		else{
			testSquare[place] = null
            testSquare[pos] = blackstone
            console.log(testSquare)
			if (calculateWinner(testSquare) === blackstone) pwmBefore++
		}
	}

  // Count the number of potential winning moves after the move
  var pwmAfter = 0;
	
	for (const pos in placeList){
		let testSquare = JSON.parse(JSON.stringify(squares1D))
		if (testSquare[pos] !== null) continue;
		else{
            testSquare[pos] = blackstone
			if (calculateWinner(testSquare) === blackstone) pwmAfter++
		}
	}
  
  // If the move increased the number of potential winning moves by 2 or more, end the game
  console.log("pwmBefore:",pwmBefore, "pwmAfter:",pwmAfter)
  if (pwmAfter - pwmBefore >= 2) {
    console.log("WINNER: ", "O")
    return("O")
  }else{
    return null
  }
}

function calculateWinner(squares) {
  const width = 19;
  const height = 19;

  const dirs = [
    [1,0], [-1,0], [0,1], [0,-1],
    [1,1], [1,-1], [-1,1], [-1,-1]
  ];

  // Iterate over each cell of the board
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const index = i * width + j;
      const currentPlayer = squares[index];
      if (currentPlayer === null) continue; // Skip if the cell is empty

      // Check for winning sequences in all directions
      for (const [dx, dy] of dirs) {
        let x = j, y = i, count = 1;
        for (let k = 0; k < 5; k++) {
          const newIndex = (y + dy) * width + (x + dx);
          if (newIndex < 0 || newIndex >= width * height) break; // Break if index is out of range
          if (squares[newIndex] !== currentPlayer) break; // Break if the sequence is interrupted
          y += dy;
          x += dx;
          count++;
        }
        if (count === 5) {
          // Winning sequence found, return the player ID
          console.log("WINNER: ", currentPlayer)
          return currentPlayer;
        }
      }
    }
  }
  // No winning sequence found
  console.log("no winning sequence")
  return null;
}

function checkWinner(player, squares, place){
  if (player === "X"){
    let res = calculateWinner(squares, 19, 19)
    if (res == null) return checkEarlyTermination(squares, place)
  }else{
    return calculateWinner(squares, 19, 19)
  }
}

function GameEndModal({summaryGame, winner}) {
  if (document.getElementById('endAudio')){
    document.getElementById('endAudio').play();
  }
  let winnerColor = null
  if(winner==="X"){
    winnerColor = "black"
  }
  else if(winner==="O"){
    winnerColor = "white"
  }
  return (
    <>
      <Modal.Header>The {winnerColor} side wins!</Modal.Header>
      <Modal.Body>
        <Button onClick={summaryGame}>Return to Home</Button>
      </Modal.Body>
    </>
  )
}

function RetractModal({hasRetraction,receiveRetraction,confirmRetractionRequest,refuseRetractionRequest}) {
  if(hasRetraction){
    return (
      <>
        <Modal.Header>You raise a retract request</Modal.Header>
        <Modal.Body>
          Please waiting for another player's confimation...
        </Modal.Body>
      </>
    )
  }
  if(receiveRetraction){
    return(
      <>
        <Modal.Header>Receive opposite's retract request</Modal.Header>
        <Modal.Body>
          <Button onClick={confirmRetractionRequest}>Confirm</Button>
          <Button onClick={refuseRetractionRequest}>Refuse</Button>
        </Modal.Body>
      </>
    )
  }
}
