// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Greeter {
    // Add a maximum limit for names
    uint256 public constant MAX_NAMES = 1000;
    // Array to store all submitted names
    string[] public submittedNames;

    // Event to emit when a new greeting is created
    event NewGreeting(string name, string greeting, uint256 timestamp);

    function greet(string memory name) public returns (string memory) {
        // Check array size
        require(submittedNames.length < MAX_NAMES, "Max names limit reached");

        // Add the name to our storage array
        submittedNames.push(name);

        // Create the greeting
        string memory greeting = string(abi.encodePacked("Hello, ", name));

        // Emit event for the new greeting
        emit NewGreeting(name, greeting, block.timestamp);

        return greeting;
    }

    function getSubmittedNames() public view returns (string[] memory) {
        return submittedNames;
    }
}
