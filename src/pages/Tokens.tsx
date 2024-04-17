import { useState, useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  AccountLayout,
  getMint,
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";
import { RevokeAuthority } from "../components/Revoke";
import { VStack } from "@chakra-ui/react";

enum Option {
  Freeze,
  Mint,
}

const Tokens = () => {
  const toast = useToast();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [account, setAccount] = useState("");
  const [mintAuthority, setMintAuthority] = useState([]);
  const [freezeAuthority, setfreezeAuthority] = useState([]);
  const [revokeMintToken, setRevokeMintToken] = useState("");
  const [revokeFreezeToken, setRevokeFreezeToken] = useState("");
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
        console.log("connect");
      }
    } else {
      setAccount("");
      setMintAuthority([]);
      setfreezeAuthority([]);
    }
  }, [wallet]);
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
      tokens.push(accountData.mint.toBase58());
    });
    let mintAuthorityList = [],
      freezeAuthorityList = [];
    for (const item of tokens) {
      const mintInfo = await getMint(connection, new PublicKey(item));

      if (mintInfo.mintAuthority) {
        if (mintInfo.mintAuthority.toBase58() == wallet.publicKey.toBase58()) {
          mintAuthorityList.push(mintInfo.address.toBase58());
        }
      }
      if (mintInfo.freezeAuthority) {
        if (mintInfo.freezeAuthority.toBase58() == wallet.publicKey.toBase58())
          freezeAuthorityList.push(mintInfo.address.toBase58());
      }
    }
    setMintAuthority(mintAuthorityList);
    setfreezeAuthority(freezeAuthorityList);
  };

  const revoke = async (option: Option) => {
    try {
      const mintAddress = option ? revokeMintToken : revokeFreezeToken;
      if (!mintAddress) {
        return;
      }

      // Create a new PublicKey object for the mint address
      const mintPublicKey = new PublicKey(mintAddress);

      // Fetch the mint information to get the current mint authority
      const mintInfo = await getMint(connection, mintPublicKey);
      console.log("mint Info", mintInfo);

      if (!mintInfo.mintAuthority && option == Option.Mint) {
        NotifyMessage("Minting is already disabled or there is no authority.");
        return;
      }
      if (!mintInfo.freezeAuthority && option == Option.Freeze) {
        NotifyMessage(
          "Freeze account is already disabled or there is no authority."
        );
        return;
      }

      // Create the instruction to disable minting
      const instruction = createSetAuthorityInstruction(
        mintPublicKey, // Token Mint Address
        option ? mintInfo.mintAuthority : mintInfo.freezeAuthority, // Current Authority
        option ? AuthorityType.MintTokens : AuthorityType.FreezeAccount, // New Authority (null disables minting)
        null,
        []
      );

      // Create a new transaction
      const transaction = new Transaction().add(instruction);

      await wallet.sendTransaction(transaction, connection, { signers: [] });
      NotifyMessage("Successfully Revoked");
      await getTokens();
    } catch (error) {
      console.error("Failed to disable minting:", error);
    }
  };

  return (
    <>
      <VStack spacing="4y">
        <RevokeAuthority
          title={"Revoke Mint Authority"}
          subTitle={
            "Revoking mint authority ensures that there can be no more tokens minted than the total supply. This provides security and peace of mind to buyers."
          }
          button={"Revoke Mint Authority"}
          onSelectToken={setRevokeMintToken}
          onRevokeAuthority={() => revoke(Option.Mint)}
          selectedToken={revokeMintToken}
          tokenList={mintAuthority}
        ></RevokeAuthority>

        <RevokeAuthority
          title={"Revoke Freeze Authority"}
          subTitle={
            "If you want to create a liquidity pool you will need to 'Revoke Freeze Authority' of the Token, you can do that here."
          }
          button={"Revoke Freeze Authority"}
          onSelectToken={setRevokeFreezeToken}
          onRevokeAuthority={() => revoke(Option.Freeze)}
          selectedToken={revokeFreezeToken}
          tokenList={freezeAuthority}
        ></RevokeAuthority>
      </VStack>
    </>
  );
};
export default Tokens;
