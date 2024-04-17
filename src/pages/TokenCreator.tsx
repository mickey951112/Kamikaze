import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WebBundlr } from "@bundlr-network/client";
import { useToast } from "@chakra-ui/react";
import {
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Button,
  VStack,
  HStack,
  Container,
  Textarea,
  Flex,
  Heading,
  Text,
} from "@chakra-ui/react";
import { AttachmentIcon } from "@chakra-ui/icons";
import { notify } from "../utils/notifications";
function TokenCreator() {
  const toast = useToast();
  const wallet = useWallet();
  const { connection } = useConnection();
  const { sendTransaction } = useWallet();

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals, setDecimals] = useState("");
  const [description, setDescription] = useState("");

  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState("");

  let bundlr: WebBundlr | null = null;

  useEffect(() => {
    if (wallet && wallet.connected) {
      const connectProvider = async () => {
        await wallet.connect();
        const provider = wallet.wallet.adapter;
        await provider.connect();
        setProvider(provider);
      };
      if (account != wallet.publicKey.toBase58()) {
        connectProvider();
        setAccount(wallet.publicKey.toBase58());
      }
    } else {
      setAccount("");
    }
  }, [wallet]);

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
  const handleCreateToken = async () => {
    try {
      console.log("connection", connection);
      console.log("balance", await connection.getBalance(wallet.publicKey));
      if (
        !tokenName ||
        !tokenSymbol ||
        !decimals ||
        !amount ||
        !description ||
        !imagePreview
      ) {
        NotifyMessage("Fill the all of the fields");
        return;
      }

      const info = await configureMetadata();
      const from = wallet;

      const mintKeypair = Keypair.generate();
      const tokenATA = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        from.publicKey
      );
      const lamports = await getMinimumBalanceForRentExemptMint(connection);

      const createMetadataInstruction =
        createCreateMetadataAccountV3Instruction(
          {
            metadata: PublicKey.findProgramAddressSync(
              [
                Buffer.from("metadata"),
                PROGRAM_ID.toBuffer(),
                mintKeypair.publicKey.toBuffer(),
              ],
              PROGRAM_ID
            )[0],
            mint: mintKeypair.publicKey,
            mintAuthority: from.publicKey,
            payer: from.publicKey,
            updateAuthority: from.publicKey,
          },
          {
            createMetadataAccountArgsV3: {
              data: {
                name: info.tokenName,
                symbol: info.tokenSymbol,
                uri: info.metadata.toString(),
                // we don't need that
                creators: null,
                sellerFeeBasisPoints: 0,
                uses: null,
                collection: null,
              },
              isMutable: true,
              collectionDetails: null,
            },
          }
        );

      const createNewTokenTransaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: from.publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports: lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          info.decimals,
          from.publicKey,
          from.publicKey,
          TOKEN_PROGRAM_ID
        ),

        createAssociatedTokenAccountInstruction(
          from.publicKey,
          tokenATA,
          from.publicKey,
          mintKeypair.publicKey
        ),

        createMintToInstruction(
          mintKeypair.publicKey,
          tokenATA,
          from.publicKey,
          info.amount * Math.pow(10, info.decimals)
        ),
        createMetadataInstruction
      );
      console.log("createNewTokenTransaction", createNewTokenTransaction);
      const tx = await sendTransaction(createNewTokenTransaction, connection, {
        signers: [mintKeypair],
      });
      NotifyMessage(
        `Created Token. Token address: ${mintKeypair.publicKey.toBase58()}`
      );
      console.log("Transaction complted", tx);
    } catch (error) {
      console.log("error", error);
    }
  };

  const handleImageChange = async (event) => {
    const files = event.target.files;
    let reader = new FileReader();
    if (files) {
      reader.onload = function () {
        if (reader.result) {
          const uint8array = new Uint8Array(reader.result as ArrayBuffer);
          const blob = new Blob([uint8array], { type: "image/png" });
          const preview = URL.createObjectURL(blob);
          setImagePreview(preview);
          setImageFile(Buffer.from(reader.result as ArrayBuffer));
        }
      };
      reader.readAsArrayBuffer(files[0]);
    }
  };

  const initializeBundlr = async (): Promise<WebBundlr> => {
    try {
      const bundlrs = [
        {
          id: 1,
          network: "mainnet-beta",
          name: "https://node1.bundlr.network",
        },
        { id: 2, network: "devnet", name: "https://devnet.bundlr.network" },
      ];
      const selected = bundlrs[1];
      // initialise a bundlr client
      console.log("Name", selected.name);
      console.log("provider", provider);
      if (!provider) return;
      if (selected.name === "https://devnet.bundlr.network") {
        bundlr = new WebBundlr(`${selected.name}`, "solana", provider, {
          providerUrl: "https://api.devnet.solana.com",
        });
      } else {
        bundlr = new WebBundlr(`${selected.name}`, "solana", provider);
      }

      console.log(bundlr);

      try {
        // Check for valid bundlr node
        await bundlr.utils.getBundlerAddress("solana");
      } catch (err) {
        notify({ type: "error", message: `${err}` });
        return;
      }
      try {
        await bundlr.ready();
      } catch (err) {
        notify({ type: "error", message: `${err}` });
        return;
      } //@ts-ignore
      if (!bundlr.address) {
        notify({
          type: "error",
          message: "Unexpected error: bundlr address not found",
        });
      }
      notify({
        type: "success",
        message: `Connected to ${selected.network}`,
      });
      return bundlr;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  const uploadImage = async () => {
    console.log("ImageFile", imageFile);
    const price = await bundlr.utils.getPrice("solana", imageFile.length);
    let amount = Number(bundlr.utils.unitConverter(price));

    const loadedBalance = await bundlr.getLoadedBalance();
    let balance = Number(bundlr.utils.unitConverter(loadedBalance.toNumber()));

    console.log(amount, balance);

    if (balance < amount) {
      // await bundlr.fund(LAMPORTS_PER_SOL);
      await bundlr.fund(Number(amount * 1e9));
    }

    const imageResult = await bundlr.uploader.upload(imageFile, [
      { name: "Content-Type", value: "image/png" },
    ]);
    const arweaveImageUrl = `https://arweave.net/${imageResult.data.id}?ext=png`;
    console.log("image url", arweaveImageUrl);
    if (arweaveImageUrl) {
      NotifyMessage(arweaveImageUrl);
    }
    return arweaveImageUrl;
  };

  const uploadMetadata = async (data: any): Promise<String> => {
    console.log("start upload metaData");
    const price = await bundlr.utils.getPrice("solana", data.length);
    let amount = Number(bundlr.utils.unitConverter(price));
    // amount = Number(amount);

    const loadedBalance = await bundlr.getLoadedBalance();
    let balance = Number(bundlr.utils.unitConverter(loadedBalance.toNumber()));

    if (balance < amount) {
      await bundlr.fund(amount);
    }

    const metadataResult = await bundlr.uploader.upload(data, [
      { name: "Content-Type", value: "application/json" },
    ]);
    const arweaveMetadataUrl = `https://arweave.net/${metadataResult.data.id}`;

    NotifyMessage(arweaveMetadataUrl);
    return arweaveMetadataUrl;
  };

  const configureMetadata = async () => {
    await initializeBundlr();
    const url = await uploadImage();
    NotifyMessage(`Image uploaded. /n imageUrl: ${url}`);
    const content = {
      name: tokenName,
      symbol: tokenSymbol,
      description: description,
      image: url,
    };
    console.log("content", content);
    const jsonContent = JSON.stringify(content, null, 4);
    const buffer = new TextEncoder().encode(jsonContent).buffer;

    const metadataUrl = await uploadMetadata(Buffer.from(buffer));
    NotifyMessage(`metadataUrl: ${metadataUrl}`);
    return {
      tokenName: tokenName,
      tokenSymbol: tokenSymbol,
      metadata: metadataUrl,
      decimals: Number(decimals),
      amount: Number(amount),
    };
  };
  return (
    <Container maxW={"full"} padding={0}>
      <Box
        bg="purple.800"
        p={4}
        borderRadius="2xl"
        boxShadow="dark-lg"
        color="white"
      >
        <Flex
          as="nav"
          align="center"
          justify="space-between"
          wrap="wrap"
          paddingY="1.5"
          paddingX="6"
          color="white"
          boxShadow="sm"
          borderRadius="lg"
          marginBottom="20px"
        >
          <Flex align="center" mr={5}>
            <Heading as="h1" size="lg" letterSpacing={"tighter"}>
              Solana Token Creator
            </Heading>
          </Flex>

          <Box>
            <Text fontSize="sm" opacity="0.8">
              The perfect tool to create Solana SPL tokens. Simple, user
              friendly, and fast.
            </Text>
          </Box>
        </Flex>
        <VStack spacing={4} align="stretch">
          <HStack align="top">
            <FormControl isInvalid={!tokenName}>
              <FormLabel>Name</FormLabel>
              <Input
                placeholder="Name"
                onChange={(e) => setTokenName(e.target.value)}
              />
              <FormErrorMessage>Name is required</FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={!tokenSymbol}>
              <FormLabel>Symbol</FormLabel>
              <Input
                placeholder="Symbol"
                onChange={(e) => setTokenSymbol(e.target.value)}
              />
              <FormErrorMessage>Symbol is required</FormErrorMessage>
            </FormControl>
          </HStack>
          <HStack>
            <FormControl isInvalid={!decimals}>
              <FormLabel>Decimals</FormLabel>
              <Input
                placeholder="Decimals"
                type="number"
                value={decimals}
                onChange={(e) => setDecimals(e.target.value)}
              />
              <FormErrorMessage>Decimal is required</FormErrorMessage>
            </FormControl>
            <Box>
              <FormLabel>Image</FormLabel>
              <Input
                type="file"
                accept="image/*" // Optionally, specify the types of images accepted
                onChange={(e) => handleImageChange(e)} // Replace with your method to handle file selection
                id="images"
                name="images"
                hidden
              />
              <FormLabel
                htmlFor="images"
                border={"1px solid #E2E8F0"}
                borderRadius={"5px"}
                alignItems={"center"}
                justifyContent={"center"}
                display={"flex"}
                boxSize={"100px"}
              >
                {!imagePreview ? (
                  <AttachmentIcon />
                ) : (
                  <img src={imagePreview} width="150px" />
                )}
              </FormLabel>
            </Box>
          </HStack>
          <FormControl isInvalid={!amount}>
            <FormLabel>Supply</FormLabel>
            <Input
              placeholder="Supply"
              type="number"
              onChange={(e) => setAmount(e.target.value)}
            />
            <FormErrorMessage>Amount is required</FormErrorMessage>
          </FormControl>
          <FormControl isInvalid={!description}>
            <FormLabel>Description</FormLabel>
            <Textarea
              placeholder="Description"
              onChange={(e) => setDescription(e.target.value)}
            />
            <FormErrorMessage>Description is required</FormErrorMessage>
          </FormControl>
          <Button colorScheme="blue" onClick={() => handleCreateToken()}>
            Create Token
          </Button>
        </VStack>
      </Box>
    </Container>
  );
}

export default TokenCreator;
