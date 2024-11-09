import React, { useState, useEffect, useCallback } from "react";
import { Web3 } from "web3";

function App() {
  const ABI = [
    {
      inputs: [
        {
          internalType: "string",
          name: "name",
          type: "string",
        },
      ],
      name: "greet",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "string",
          name: "name",
          type: "string",
        },
        {
          indexed: false,
          internalType: "string",
          name: "greeting",
          type: "string",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "timestamp",
          type: "uint256",
        },
      ],
      name: "NewGreeting",
      type: "event",
    },
    {
      inputs: [],
      name: "getSubmittedNames",
      outputs: [
        {
          internalType: "string[]",
          name: "",
          type: "string[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "MAX_NAMES",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "submittedNames",
      outputs: [
        {
          internalType: "string",
          name: "",
          type: "string",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ];

  // Network configurations
  const SUPPORTED_NETWORKS = {
    355113: {
      chainId: "0x56b29",
      chainName: "Bitfinity Testnet",
      nativeCurrency: {
        name: "Bitfinity",
        symbol: "BTF",
        decimals: 18,
      },
      rpcUrls: ["hhttps://testnet.bitfinity.network/"],
      blockExplorerUrls: ["https://explorer.testnet.bitfinity.network/"],
    },
  };

  // Contract addresses for different networks
  const CONTRACT_ADDRESSES = {
    355113: "0x93bddce6f11068d1eafa1c23c3683e5364edb9f8", // Ethereum Mainnet
  };

  // Network Selector Component
  const NetworkSelector = ({ chainId, onNetworkChange }) => {
    const handleChange = async (event) => {
      const newChainId = parseInt(event.target.value);
      await onNetworkChange(newChainId);
    };

    return (
      <select
        value={chainId || ""}
        onChange={handleChange}
        className="p-2 border rounded"
      >
        <option value="">Select Network</option>
        {Object.entries(SUPPORTED_NETWORKS).map(([id, network]) => (
          <option key={id} value={id}>
            {network.chainName}
          </option>
        ))}
      </select>
    );
  };

  const LoadingSpinner = ({ isLoading, children }) => {
    return (
      <div className="relative">
        {children}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  };

  // Custom hook for Web3 and MetaMask
  const useWeb3 = () => {
    const [web3, setWeb3] = useState(null);
    const [account, setAccount] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
      const initWeb3 = async () => {
        if (window.ethereum) {
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);

          try {
            // Request account access
            const accounts = await window.ethereum.request({
              method: "eth_requestAccounts",
            });
            setAccount(accounts[0]);

            // Get current chain ID
            const chainId = await web3Instance.eth.getChainId();
            setChainId(chainId);
          } catch (error) {
            setError("User denied account access");
          }
        } else {
          setError("Please install MetaMask");
        }
      };

      initWeb3();
    }, []);

    return { web3, account, chainId, error };
  };

  const [greeting, setGreeting] = useState("");
  const [greetingList, setGreetingList] = useState([]);
  const { web3, account, chainId, error } = useWeb3();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    const name = event.target.elements.name.value;
    if (name !== "") {
      if (contract) {
        setLoading(true);
        contract.methods
          .greet(name)
          .send({ from: account })
          .then((err, greeting_message) => {
            setGreeting(greeting_message);
            setLoading(false);
          });
      }
    }
    return false;
  }

  function getGreetingList() {
    if (contract) {
      contract.methods
        .getSubmittedNames()
        .call()
        .then((profile) => {
          setGreetingList(profile);
        });
    }
  }

  // Initialize contract
  const initializeContract = useCallback(async () => {
    if (!web3 || !chainId) return;

    const address = CONTRACT_ADDRESSES[chainId];
    if (!address) {
      console.error("Contract not deployed on this network");
      return;
    }

    try {
      const contractInstance = new web3.eth.Contract(ABI, address);
      setContract(contractInstance);
    } catch (error) {
      console.error("Contract initialization error:", error);
    }
  }, [web3, chainId]);

  // Handle network changes
  const handleNetworkChange = async (newChainId) => {
    if (!window.ethereum) return;

    const network = SUPPORTED_NETWORKS[newChainId];
    setLoading(true);

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: network.chainId }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [network],
          });
        } catch (addError) {
          console.error("Failed to add network:", addError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Effect for contract initialization
  useEffect(() => {
    if (web3 && chainId) {
      initializeContract();
    }
  }, [web3, chainId, initializeContract]);

  // Effect for MetaMask events
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("chainChanged", (newChainId) => {
        window.location.reload();
      });

      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      });

      return () => {
        window.ethereum.removeAllListeners("chainChanged");
        window.ethereum.removeAllListeners("accountsChanged");
      };
    }
  }, []);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }
  return (
    <main>
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">
            Network Selection{" "}
            <NetworkSelector
              chainId={chainId}
              onNetworkChange={handleNetworkChange}
            />
          </h2>
        </div>

        {loading && <div className="text-blue-500">Switching networks...</div>}

        {account && (
          <div className="mb-4">
            <h3 className="font-bold">Connected Account:</h3>
            <p className="font-mono">{account}</p>
          </div>
        )}
      </div>
      <img src="/logo2.svg" alt="DFINITY logo" />
      <br />
      <br />
      <LoadingSpinner isLoading={loading}>
        <form action="#" onSubmit={handleSubmit}>
          <label htmlFor="name">Enter your name: &nbsp;</label>
          <input id="name" alt="Name" type="text" />
          <button type="submit">Click Me!</button>
          <button
            type="button"
            onClick={() => {
              getGreetingList();
            }}
          >
            ~Show Submitted Names~
          </button>
        </form>
      </LoadingSpinner>
      <section id="greeting">{greeting}</section>
      <div>
        <ul>
          {greetingList.map((greeting, index) => (
            <li key={`li-${index}`}>{greeting}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export default App;
