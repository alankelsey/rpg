<?php

//includes
include ('connect.php');
include ('db.php');



	//public vars
	//public $playerName = "";
	 $playerLevel = 0;
	 $playerHealth = 10;
	 $playerStrength = 0;
     $playerKindness = 0;

	//To test name
	function testit()
	{
		echo $playerName;
		echo "name set";
	}

	
	//sets name and rertives name
	function setName($nameFromUser)
	{
		$value = 1;
		//include_once ('db.php');
		$stmnt = "INSERT INTO `firstplace`.`Users`(`userid`, `username`, `password`) 
		VALUES (NULL, '$nameFromUser', '$value')";
		
	}

	function getName($userid)
	{
		
	 //global $hostname;
	$hostname = "C0d3x.db.6752384.hostedresource.com";
	$username = "C0d3x";
	$dbname = "C0d3x";
	$password = "L0ngpass!";
	// global $username;
	// global $dbname;
	// global $password;
	
	
		$stmntnmid ="SELECT username FROM firstplace.Users WHERE userid
		= ".$userid;
		$db = new mysqli($hostname, $username, $password, $dbname);
	
		$testq = $db->prepare($stmntnmid);
    
//		$testq->execute();
//		$testq->bind_result($username);

//		while ($testq->fetch())
//		{
//			return $username;
			
//		}
	}
		

	
	//Sets and receives player level
	function setPlayerLevel($level)
	{
		global $playerLevel;
		$this->playerLevel = $level;
	}

	function getPlayerLevel()
	{
		return "LEVEL " . $this->playerLevel . " /100";
	}

	//Sets and returns player health
	function setPlayerHealth($health)
	{
		$this->playerHealth = $health;
		
		
	}
	
	function getPlayerHealth()
	{
		return $this->playerHealth;
	}

	//Sets and returns player strength
	function setPlayerStrength($strength)
	{
		global $playerStrength;
		$this->playerStrength = $strength;
		
	}

	function getPlayerStrength()
	{
		return "STRENGTH " . $this->playerStrength . " /100";
	}

	//Sets and returns player kindness
	function setPlayerKindness($kindness) 
	{
		global $playerKindness;
		$this->playerKindness = $kindness;
		return "KINDNESS " . $playerKindness . " /100";
	}

	function getPlayerKindness()
	{
		return "KINDNESS " . $this->playerKindness . " /100";
	}

	//choice logic will move to another classss
	function choices($choiceselected)
	{

		if ($choiceselected = 1 || $choiceselected = 2 || $choiceselected = 3)
		{
			echo "good choice";
		}
		else 
		{
			echo "invalid response";
		}
	

	}


	function decreaseHealth()
	{
		$lowerHealth = 1;
		$currentHealth = $this->playerHealth;
		
		//echo "* playerhealth: ";
		//echo $this->playerHealth;
		
		//echo "* lowerHealth: ";
		//echo $lowerHealth;
		
		$newHealth = $currentHealth - $lowerHealth;
		//echo " * Set new health: ";		
		$this->playerHealth = $newHealth;
	
	}

	




?>