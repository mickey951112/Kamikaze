import { useState, useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, Keypair } from "@solana/web3.js";
import {
  DataV2,
  createUpdateMetadataAccountV2Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { findMetadataPda } from "@metaplex-foundation/js";
import { VStack, Text, Box, Button, Select, Input } from "@chakra-ui/react";
import {
  TOKEN_PROGRAM_ID,
  AccountLayout,
  getMint,
  getAssociatedTokenAddress,
  createBurnCheckedInstruction,
} from "@solana/spl-token";

const TokenManager = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const toast = useToast();
  const [account, setAccount] = useState("");
  const [tokenList, setTokenList] = useState([]);
  const [selectedToken, setSelectedToken] = useState("");
  const [selectedTokenAmount, setSelectedTokenAmount] = useState(0);

  const [tokenName, setTokenName] = useState("");
  const [tokenSymol, setTokenSymol] = useState("");
  const [metadataUrl, setMetadataUrl] = useState("");
  const [burnAmount, setBurnAmount] = useState("");

  const NotifyMessage = (
    message: string,
    status: "success" | "error" | "warning" | "info" = "info"
  ) => {
    toast({
      title: "Notification",
      description: message,
      status: status, // Can be "success", "error", "warning", or "info"
      duration: 2000,
      isClosable: true,
      position: "top", // Can be any valid position
    });
  };
  useEffect(() => {
    if (wallet && wallet.connected) {
      if (wallet.publicKey.toBase58() != account) {
        setAccount(account);
        getTokens();
      }
    } else {
      setAccount("");
      setTokenList([]);
    }
  }, [wallet]);

  const selectTokenHanlder = async (token: string) => {
    setSelectedToken(token);
    const result = tokenList.find((item) => item.token == token);
    const mintInfo = await getMint(connection, new PublicKey(token));
    setSelectedTokenAmount(result.amount / 10 ** mintInfo.decimals);
  };
  const getTokens = async () => {
    const tokenAccounts = await connection.getTokenAccountsByOwner(
      wallet.publicKey,
      {
        programId: TOKEN_PROGRAM_ID,
      }
    );

    const tokens = [];
    tokenAccounts.value.forEach((tokenAccount) => {
      const accountData = AccountLayout.decode(tokenAccount.account.data);
      tokens.push({
        token: accountData.mint.toBase58(),
        amount: Number(accountData.amount),
      });
    });
    setTokenList(tokens);
  };

  const update = async () => {
    if (!tokenName || !tokenSymol || !metadataUrl || !selectedToken) {
      console.log("Fill all fields");
      NotifyMessage("Fill all fields!", "warning");
      return;
    }
    const from = wallet;

    const mint = new PublicKey(selectedToken);
    const metadataPDA = await findMetadataPda(mint);
    const tokenMetadata = {
      name: tokenName,
      symbol: tokenSymol,
      uri: metadataUrl,
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    } as DataV2;

    const updateMetadataTransaction = new Transaction().add(
      createUpdateMetadataAccountV2Instruction(
        {
          metadata: metadataPDA,
          updateAuthority: from.publicKey,
        },
        {
          updateMetadataAccountArgsV2: {
            data: tokenMetadata,
            updateAuthority: from.publicKey,
            primarySaleHappened: true,
            isMutable: true,
          },
        }
      )
    );

    await wallet.sendTransaction(updateMetadataTransaction, connection, {
      signers: [],
    });
    NotifyMessage("Successfully Updated!");
  };

  const burnTokens = async (token: string, amount: number) => {
    const secretKeyData = new Uint8Array([
      96, 44, 176, 28, 40, 189, 131, 178, 228, 218, 26, 56, 226, 250, 10, 95,
      215, 208, 162, 177, 229, 121, 21, 232, 201, 84, 193, 98, 247, 11, 82, 3,
      236, 141, 237, 142, 27, 195, 167, 146, 96, 112, 208, 137, 103, 231, 48,
      90, 22, 32, 10, 110, 50, 68, 172, 214, 5, 18, 107, 200, 144, 14, 112, 215,
    ]);

    // Create the Keypair object
    const from = Keypair.fromSecretKey(secretKeyData);
    console.log("From", from.publicKey.toBase58());
    if (!burnAmount) {
      NotifyMessage("Fill all fields!", "warning");
      return;
    }
    const account = await getAssociatedTokenAddress(
      new PublicKey(token),
      wallet.publicKey
    );

    const mintInfo = await getMint(connection, new PublicKey(token));
    console.log("mintInfo", mintInfo);
    if (selectedTokenAmount < amount) {
      NotifyMessage("Burn amount exceeds balance");
      return;
    }
    const transaction = new Transaction().add(
      createBurnCheckedInstruction(
        account, // PublicKey of Owner's Associated Token Account
        new PublicKey(token), // Public Key of the Token Mint Address
        wallet.publicKey, // Public Key of Owner's Wallet
        amount * 10 ** mintInfo.decimals, // Number of tokens to burn
        mintInfo.decimals // Number of Decimals of the Token Mint
      )
    );

    await wallet.sendTransaction(transaction, connection, {
      signers: [],
    });

    setSelectedTokenAmount(selectedTokenAmount - amount);
    getTokens();
    NotifyMessage("Successfully Burned");
  };

  return (
    <>
      <VStack spacing="4">
        <VStack
          spacing={4}
          p={5}
          backgroundColor="purple.800"
          borderRadius="lg"
          boxShadow="md"
          width="100%"
          alignItems="stretch"
        >
          <Text fontSize="xl" color="white">
            Manage Your Token
          </Text>
          <Text fontSize="md" color="purple.200">
            Begin the seamless process of updating your SPL token's metadata to
            ensure that your token's information remains accurate and up to date
            with the latest details
          </Text>
          <Box width="full">
            <Select
              placeholder="Select Token"
              value={selectedToken}
              onChange={(e) => selectTokenHanlder(e.target.value)}
              variant="filled"
              color="purple.700"
            >
              {tokenList.map((item, key) => (
                <option value={item.token} key={key}>
                  {item.token}
                </option>
              ))}
            </Select>
          </Box>
          <VStack spacing="2">
            <Input
              placeholder="Type your new token name"
              onChange={(e) => setTokenName(e.target.value)}
            ></Input>
            <Input
              placeholder="Type your new token symbol"
              onChange={(e) => setTokenSymol(e.target.value)}
            ></Input>
            <Input
              placeholder="Type your new meatdata Url"
              onChange={(e) => setMetadataUrl(e.target.value)}
            ></Input>
          </VStack>
          <Button colorScheme="blue" variant="solid" onClick={update}>
            Update
          </Button>
          <Text fontSize="xl" color="white">
            Burn Tokens
          </Text>
          <Text fontSize="md" color="purple.200">
            Balance {selectedTokenAmount}
          </Text>
          <Input
            type="number"
            placeholder="Type your token amount to burn"
            onChange={(e) => setBurnAmount(e.target.value)}
          ></Input>
          <Button
            colorScheme="blue"
            variant="solid"
            onClick={() => burnTokens(selectedToken, Number(burnAmount))}
          >
            Burn
          </Button>
        </VStack>
      </VStack>
    </>
  );
};
export default TokenManager;
