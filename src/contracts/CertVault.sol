// MAIN BLOCKCHAIN FILE 
// WHEN IT'S DEPLOYED, THE FILE IS
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract CertVault {
    struct Certificate {
        string recipientName;
        string courseName;
        string ipfsHash;
        uint256 issuedOn;
        address issuer;
        uint256 revokedAt;
    }

    address public owner;
    mapping(address => bool) public isAdmin;

    mapping(bytes32 => Certificate) public certificates;
    mapping(bytes32 => bool) public isValidIPFS;

    event CertificateIssued(string ipfsHash, string recipientName, string courseName, uint256 issuedOn, address indexed issuer);
    event CertificateRevoked(string ipfsHash, uint256 revokedAt, address indexed revokedBy);
    event AdminAdded(address indexed account);
    event AdminRemoved(address indexed account);

    function _hasPrefix(bytes memory data, bytes memory prefix) internal pure returns (bool) {
        if (data.length < prefix.length) {
            return false;
        }

        for (uint256 i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) {
                return false;
            }
        }

        return true;
    }

    function _slice(bytes memory data, uint256 start) internal pure returns (string memory) {
        require(start <= data.length, "Invalid slice");

        bytes memory result = new bytes(data.length - start);
        for (uint256 i = 0; i < result.length; i++) {
            result[i] = data[i + start];
        }

        return string(result);
    }

    function _normalizeIPFSHash(string memory input) internal pure returns (string memory) {
        bytes memory data = bytes(input);

        if (_hasPrefix(data, bytes("ipfs://"))) {
            return _slice(data, 7);
        }

        if (_hasPrefix(data, bytes("/ipfs/"))) {
            return _slice(data, 6);
        }

        if (_hasPrefix(data, bytes("https://gateway.pinata.cloud/ipfs/"))) {
            return _slice(data, 34);
        }

        if (_hasPrefix(data, bytes("https://ipfs.io/ipfs/"))) {
            return _slice(data, 21);
        }

        return input;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        isAdmin[msg.sender] = true;
        emit AdminAdded(msg.sender);
    }

    function addAdmin(address _account) external onlyOwner {
        require(_account != address(0), "Invalid address");
        require(!isAdmin[_account], "Already admin");
        isAdmin[_account] = true;
        emit AdminAdded(_account);
    }

    function removeAdmin(address _account) external onlyOwner {
        require(isAdmin[_account], "Not admin");
        isAdmin[_account] = false;
        emit AdminRemoved(_account);
    }

    function issueCertificate(
        string memory _recipientName,
        string memory _courseName,
        string memory _ipfsHash
    ) external onlyAdmin {
        require(bytes(_recipientName).length > 0, "Invalid recipient");
        require(bytes(_courseName).length > 0, "Invalid course");
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");
        string memory normalizedHash = _normalizeIPFSHash(_ipfsHash);
        bytes32 key = keccak256(abi.encodePacked(normalizedHash));
        require(certificates[key].issuedOn == 0, "Certificate already issued");

        certificates[key] = Certificate({
            recipientName: _recipientName,
            courseName: _courseName,
            ipfsHash: normalizedHash,
            issuedOn: block.timestamp,
            issuer: msg.sender,
            revokedAt: 0
        });
        isValidIPFS[key] = true;

        emit CertificateIssued(normalizedHash, _recipientName, _courseName, block.timestamp, msg.sender);
    }

    function revokeCertificate(string memory _ipfsHash) external {
        string memory normalizedHash = _normalizeIPFSHash(_ipfsHash);
        bytes32 key = keccak256(abi.encodePacked(normalizedHash));
        require(isValidIPFS[key], "Not issued or already revoked");
        Certificate storage cert = certificates[key];
        require(msg.sender == cert.issuer || isAdmin[msg.sender], "Not issuer/admin");

        isValidIPFS[key] = false;
        cert.revokedAt = block.timestamp;

        emit CertificateRevoked(normalizedHash, cert.revokedAt, msg.sender);
    }

    function validateCertificate(string memory _ipfsHash) public view returns (bool) {
        string memory normalizedHash = _normalizeIPFSHash(_ipfsHash);
        bytes32 key = keccak256(abi.encodePacked(normalizedHash));
        return isValidIPFS[key];
    }

    function getCertificate(string memory _ipfsHash) public view returns (Certificate memory) {
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");
        string memory normalizedHash = _normalizeIPFSHash(_ipfsHash);
        bytes32 key = keccak256(abi.encodePacked(normalizedHash));
        require(certificates[key].issuedOn != 0, "Certificate does not exist");
        return certificates[key];
    }
}
