import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Box, Flex, Link, useColorModeValue } from "@chakra-ui/react";

const Navbar = () => {
  // These colors can be adjusted based on your theme
  const bg = useColorModeValue("gray.800", "gray.900");
  const color = useColorModeValue("white", "gray.200");

  return (
    <Flex
      bg={bg}
      color={color}
      minH={"60px"}
      py={{ base: 2 }}
      px={{ base: 4 }}
      align={"center"}
      justify={"space-between"}
      marginBottom={"20px"}
    >
      <Flex align={"center"} mr={5}>
        {/* <FaEthereum /> */}
        <Box ml={3} fontWeight="bold">
          Kamikaze
        </Box>
      </Flex>

      <Flex align={"center"} justify={"center"}>
        <Link href="/tokens" px={2}>
          Tokens
        </Link>
        <Link href="/tokens/create" px={3}>
          Create Token
        </Link>
        <Link href="/tokens/manage" px={3}>
          Manage Token
        </Link>
      </Flex>

      <Flex align={"center"}>
        <WalletMultiButton
          style={{
            backgroundColor: "#2b2b8f",
          }}
        />
      </Flex>
    </Flex>
  );
};

export default Navbar;
